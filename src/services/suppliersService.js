import { User } from '../models/User.js';
import { Suppliers } from '../models/Suppliers.js';
import { Order } from '../models/Order.js';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
    hashPassword,
    comparePassword,
    generateToken,
    sendWelcomeEmail,
    sendSupplierWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";
export class SuppliersService {
    static async createSuppliersWithUser(suppliersData) {
        try {
            const temporaryPassword = generateTemporaryPassword();
            const hashedPassword = await hashPassword(temporaryPassword);

            if (!suppliersData.full_name || !suppliersData.email) {
                throw new Error('Full name, email,  are required for user creation');
            }

            const [existingUser, supplierCode] = await Promise.all([
                User.findByEmail(suppliersData.email),
                suppliersData.supplier_code ?
                    (async () => {
                        const existingSupplier = await Suppliers.findBySupplierCode(suppliersData.supplier_code);
                        if (existingSupplier) {
                            throw new Error('Supplier code already exists');
                        }
                        return suppliersData.supplier_code;
                    })() :
                    Suppliers.generateNextSupplierCode()
            ]);

            if (existingUser) {
                throw new Error('Email already exists');
            }

            const userData = {
                full_name: suppliersData.full_name,
                email: suppliersData.email,
                phone: suppliersData.phone || null,
                password: hashedPassword,
                role: suppliersData.role,
                status: suppliersData.status,
            };

            const user = await User.create(userData);

            const suppliersRecordData = {
                user_id: user.id,
                supplier_code: supplierCode,
                company_name: suppliersData.company_name,
                contact_person: suppliersData.contact_person,
                address: suppliersData.address || null,
                contract_start: suppliersData.contract_start || null,
                contract_end: suppliersData.contract_end || null,
                notes: suppliersData.notes || null,
                system_ip: suppliersData.system_ip
            };

            const suppliers = await Suppliers.create(suppliersRecordData);


            try {
                await sendSupplierWelcomeEmail(
                    user.email,
                    user.full_name,
                    suppliersData.company_name
                );
            } catch (emailError) {

            }

            return {
                supplier: suppliers,
                message: 'Supplier created successfully with user account'
            };

        } catch (error) {
            throw error;
        }
    }

    static async getAllSuppliers(page = 1, limit = 10) {
        try {
            const result = await Suppliers.getAllSuppliers(page, limit);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getSupplierById(supplierId, page = 1, limit = 10) {
        try {
            const [supplier, ordersResult] = await Promise.all([
                Suppliers.getSupplierById(supplierId),
                Order.findAll(
                    { supplier_id: supplierId },
                    { page, limit, sortBy: 'created_at', sortOrder: 'desc' }
                )
            ]);

            const orders = ordersResult.orders || [];

            const totalOrderValue = orders.reduce((sum, order) => {
                const amount = order?.total_amount ?? order?.total_amount_formatted;
                if (typeof amount === 'number') {
                    return sum + amount;
                }
                if (typeof amount === 'string') {
                    const normalized = parseFloat(amount.replace(/[^0-9.-]/g, ''));
                    return Number.isFinite(normalized) ? sum + normalized : sum;
                }
                return sum;
            }, 0);

            const latestOrderDate = orders.length > 0 ? orders[0]?.created_at ?? orders[0]?.order_date ?? null : null;

            return {
                ...supplier,
                orders: {
                    total: ordersResult.total ?? orders.length,
                    page: ordersResult.page ?? page,
                    limit: ordersResult.limit ?? limit,
                    totalPages: ordersResult.totalPages ?? Math.ceil((ordersResult.total ?? orders.length) / limit),
                    records: orders
                },
                orders_summary: {
                    total_orders: ordersResult.total ?? orders.length,
                    total_value: Math.round(totalOrderValue * 100) / 100,
                    total_value_formatted: `$${(Math.round(totalOrderValue * 100) / 100).toFixed(2)}`,
                    latest_order_date: latestOrderDate
                }
            };
        } catch (error) {
            throw error;
        }
    }

    static async updateSupplier(supplierId, updateData) {
        try {
            const currentSupplier = await Suppliers.getSupplierById(supplierId);
            const userId = currentSupplier.user_id;

            const userData = {};
            const suppliersData = {};

            if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
            if (updateData.email !== undefined) {

                if (updateData.email !== currentSupplier.users.email) {
                    const existingUser = await User.findByEmail(updateData.email);
                    if (existingUser) {
                        throw new Error('Email already exists');
                    }
                }
                userData.email = updateData.email;
            }
            if (updateData.phone !== undefined) userData.phone = updateData.phone;
            if (updateData.role !== undefined) userData.role = updateData.role;
            if (updateData.status !== undefined) userData.status = updateData.status;

            if (updateData.supplier_code !== undefined) {

                if (updateData.supplier_code !== currentSupplier.supplier_code) {
                    const existingSupplier = await Suppliers.findBySupplierCode(updateData.supplier_code);
                    if (existingSupplier) {
                        throw new Error('Supplier code already exists');
                    }
                }
                suppliersData.supplier_code = updateData.supplier_code;
            }
            if (updateData.company_name !== undefined) suppliersData.company_name = updateData.company_name;
            if (updateData.contact_person !== undefined) suppliersData.contact_person = updateData.contact_person;
            if (updateData.address !== undefined) suppliersData.address = updateData.address;
            if (updateData.contract_start !== undefined) {
                suppliersData.contract_start = updateData.contract_start === "" ? null : updateData.contract_start;
            }

            if (updateData.contract_end !== undefined) {
                suppliersData.contract_end = updateData.contract_end === "" ? null : updateData.contract_end;
            }
            if (updateData.notes !== undefined) suppliersData.notes = updateData.notes;

            if (Object.keys(userData).length > 0) {
                await User.update(userId, userData);
            }

            if (Object.keys(suppliersData).length > 0) {
                await Suppliers.update(supplierId, suppliersData);
            }

            const updatedSupplier = await Suppliers.getSupplierById(supplierId);
            return updatedSupplier;
        } catch (error) {
            throw error;
        }
    }

    static async deleteSupplier(supplierId) {
        try {
            // Check if supplier has relationships with other tables
            const relationshipCheck = await Suppliers.checkSupplierRelationships(supplierId);
            
            if (!relationshipCheck.canDelete) {
                const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
                throw new Error(`Cannot delete this supplier because it has related data: ${relationshipMessages}. Please remove all related data first.`);
            }

            const result = await Suppliers.delete(supplierId);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static validateSupplierData(supplierData) {
        const errors = [];

        if (!supplierData.full_name) {
            errors.push('Full name is required');
        }
        if (!supplierData.email) {
            errors.push('Email is required');
        }
        if (!supplierData.company_name) {
            errors.push('Company name is required');
        }
        if (!supplierData.contact_person) {
            errors.push('Contact person is required');
        }

        if (supplierData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
            errors.push('Invalid email format');
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }

    static async searchSuppliers(filters, pagination) {
        try {
            const result = await Suppliers.search(filters, pagination);
            return successResponse(
                {
                    suppliers: result.suppliers,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        totalPages: result.totalPages
                    }
                },
                "Suppliers searched successfully"
            );
        } catch (error) {
            throw error;
        }
    }
}
