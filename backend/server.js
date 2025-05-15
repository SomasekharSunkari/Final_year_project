require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const { ethers } = require('ethers');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const contractABI = require('./contractABI.json');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// AWS S3 setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Ethereum provider setup
const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  wallet
);

// Middleware to verify JWT token from Cognito
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.decode(token);
    req.user = decoded;
    
    // Check if user is in issuers group
    const groups = decoded['cognito:groups'] || [];
    req.isIssuer = groups.includes('issuers');
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Upload certificate endpoint
app.post('/api/upload', verifyToken, upload.single('certificate'), async (req, res) => {
  if (!req.isIssuer) {
    return res.status(403).json({ message: 'Only issuers can upload certificates' });
  }

  try {
    // Generate hash
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Upload to S3
    const userId = req.user.sub;
    const key = `certificates/${userId}/${Date.now()}-${req.file.originalname}`;
    
    await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }).promise();
    
    // Store hash on blockchain
    const tx = await contract.storeHash(hash);
    await tx.wait();
    
    res.json({ 
      success: true, 
      hash,
      s3Key: key,
      txHash: tx.hash
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing certificate', error: error.message });
  }
});

// Verify certificate endpoint
app.post('/api/verify', upload.single('certificate'), async (req, res) => {
  try {
    // Generate hash
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Verify hash on blockchain
    const isVerified = await contract.verifyHash(hash);
    
    res.json({ 
      success: true, 
      hash,
      isAuthentic: isVerified
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying certificate', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});