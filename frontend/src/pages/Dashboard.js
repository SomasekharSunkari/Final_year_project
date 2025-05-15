import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isIssuer, setIsIssuer] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await Auth.currentAuthenticatedUser();
        setUser(userData);
        
        // Check if user is in issuers group
        const groups = userData.signInUserSession.accessToken.payload['cognito:groups'] || [];
        setIsIssuer(groups.includes('issuers'));
      } catch (error) {
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await Auth.signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = (await Auth.currentSession()).getIdToken().getJwtToken();
      
      const formData = new FormData();
      formData.append('certificate', file);
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success('Certificate uploaded and verified on blockchain!');
      setCertificates([...certificates, {
        name: file.name,
        hash: response.data.hash,
        date: new Date().toLocaleString(),
        txHash: response.data.txHash
      }]);
      setFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading certificate');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Certificate Verification Dashboard</h1>
          <div className="flex space-x-4">
            <Link to="/verify" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Verify Certificate
            </Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.attributes?.email}</h2>
          <p className="text-gray-600">
            User Type: {isIssuer ? 'Certificate Issuer' : 'Certificate Verifier'}
          </p>
        </div>
        
        {isIssuer && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Certificate</h2>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Certificate (PDF or Image)</label>
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !file}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Uploading...' : 'Upload & Verify'}
              </button>
            </form>
          </div>
        )}
        
        {isIssuer && certificates.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Certificates</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TX Hash</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {certificates.map((cert, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">{cert.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{cert.hash.substring(0, 10)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cert.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${cert.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {cert.txHash.substring(0, 10)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;