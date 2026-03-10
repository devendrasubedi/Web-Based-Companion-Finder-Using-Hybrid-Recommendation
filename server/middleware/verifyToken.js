import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    // Try to get token from cookies first, then from Authorization header
    let token = req.cookies.token;
    
    if (!token) {
        // Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7); // Remove "Bearer " prefix
        }
    }
    
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: "Invalid token" });
        }
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.log("error in verifyToken middleware", error.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}