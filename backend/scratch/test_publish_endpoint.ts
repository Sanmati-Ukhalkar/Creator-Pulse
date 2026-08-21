import axios from 'axios';
import jwt from 'jsonwebtoken';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';
const JWT_SECRET = 'super-secret-jwt-key-for-development'; // From env.ts

(async () => {
    try {
        const token = jwt.sign({ id: USER_ID }, JWT_SECRET, { expiresIn: '1h' });
        
        console.log("Calling /api/publish...");
        const res = await axios.post('http://localhost:4000/api/publish', {
            content: "Test content from script",
            draft_id: "cbca964a-a535-4fa7-9816-0fac36d195f8" // From logs
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log("Success:", res.data);
    } catch (err: any) {
        console.error("Status:", err.response?.status);
        console.error("Data:", err.response?.data);
    }
})();
