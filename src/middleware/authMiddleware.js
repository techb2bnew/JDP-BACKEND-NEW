import { verifyToken } from "../helpers/authHelper.js";
import {
  unauthorizedResponse,
  forbiddenResponse,
} from "../helpers/responseHelper.js";
import { User } from "../models/User.js";
import { UserToken } from "../models/UserToken.js";


export const authenticateToken = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return reply
        .code(401)
        .send(unauthorizedResponse("Access token required"));
    }

    const decoded = verifyToken(token);

   
    const tokenRecord = await UserToken.findByToken(token);
    if (!tokenRecord || !tokenRecord.is_active) {
      return reply
        .code(401)
        .send(
          unauthorizedResponse("Token has been revoked. Please login again.")
        );
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return reply
        .code(401)
        .send(
          unauthorizedResponse("Token has expired. Please login again.")
        );
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return reply
        .code(401)
        .send(
          unauthorizedResponse("User no longer exists. Please login again.")
        );
    }

    request.user = {
      ...decoded,
      id: user.id, 
      email: user.email,
      role: user.role,
    };

    return;
  } catch (error) {
    return reply
      .code(401)
      .send(unauthorizedResponse("Invalid or expired token"));
  }
};

export const requireSuperAdmin = async (request, reply) => {
  try {
    if (!request.user) {
      return reply
        .code(401)
        .send(unauthorizedResponse("Authentication required"));
    }

    if (request.user.role !== "Super Admin") {
      return reply
        .code(403)
        .send(forbiddenResponse("Super admin access required"));
    }

    return;
  } catch (error) {
    return reply
      .code(500)
      .send({ success: false, message: "Authorization error" });
  }
};

export const requireAdminOrSuperAdmin = async (request, reply) => {
  try {
    if (!request.user) {
      return reply
        .code(401)
        .send(unauthorizedResponse("Authentication required"));
    }

    if (request.user.role !== "Super Admin" && request.user.role !== "Admin") {
      return reply
        .code(403)
        .send(forbiddenResponse("Admin or Super admin access required"));
    }

    return;
  } catch (error) {
    return reply
      .code(500)
      .send({ success: false, message: "Authorization error" });
  }
};