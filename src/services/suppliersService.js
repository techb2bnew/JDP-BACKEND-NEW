import { User } from '../models/User.js';
import { Suppliers } from '../models/Suppliers.js';
import { Order } from '../models/Order.js';
import { supabase } from '../config/database.js';
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
                User.findByEmail(suppliersData.email, false),
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

           
            setImmediate(async () => {
            try {
                await sendSupplierWelcomeEmail(
                    user.email,
                    user.full_name,
                    suppliersData.company_name
                );
            } catch (emailError) {
                    console.error('Email sending failed:', emailError);
            }
            });

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
            const [supplier, ordersResult, aggregateOrders] = await Promise.all([
                Suppliers.getSupplierById(supplierId),
                Order.findAll(
                    { supplier_id: supplierId },
                    { page, limit, sortBy: 'created_at', sortOrder: 'desc' }
                ),
                supabase
                    .from('orders')
                    .select('status, total_amount, created_at', { count: 'exact' })
                    .eq('supplier_id', supplierId)
            ]);

            const orders = ordersResult.orders || [];

            const latestOrderDate = orders.length > 0 ? orders[0]?.created_at ?? orders[0]?.order_date ?? null : null;

            if (aggregateOrders.error) {
                throw new Error(`Database error (aggregate orders): ${aggregateOrders.error.message}`);
            }

            const allOrdersData = aggregateOrders.data || [];
            const aggregateCount = aggregateOrders.count ?? allOrdersData.length;

            const deliveredOrdersCount = allOrdersData.reduce((count, order) => {
                const status = (order?.status || '').toLowerCase();
                return status === 'completed' || status === 'delivered' ? count + 1 : count;
            }, 0);

            const totalAmountAcrossAllOrders = allOrdersData.reduce((sum, order) => {
                const amount = order?.total_amount;
                const parsed = parseFloat(amount);
                if (!Number.isNaN(parsed)) {
                    return sum + parsed;
                }
                return sum;
            }, 0);

            const computedTotalPages = aggregateCount > 0 ? Math.ceil(aggregateCount / limit) : 1;

            return {
                ...supplier,
                orders: {
                    total: aggregateCount,
                    page: ordersResult.page ?? page,
                    limit: ordersResult.limit ?? limit,
                    totalPages: ordersResult.totalPages ?? computedTotalPages,
                    records: orders
                },
                orders_summary: {
                    total_orders: aggregateCount,
                    total_value: Math.round(totalAmountAcrossAllOrders * 100) / 100,
                    total_value_formatted: `$${(Math.round(totalAmountAcrossAllOrders * 100) / 100).toFixed(2)}`,
                    latest_order_date: latestOrderDate,
                    delivered_orders: deliveredOrdersCount,
                    total_amount_all_orders: Math.round(totalAmountAcrossAllOrders * 100) / 100,
                    total_amount_all_orders_formatted: `$${(Math.round(totalAmountAcrossAllOrders * 100) / 100).toFixed(2)}`
                }
            };
        } catch (error) {
            throw error;
        }
    }

    static async updateSupplier(supplierId, updateData) {
        try {
            
            const { data: supplierCheck } = await supabase
                .from('suppliers')
                .select('user_id, supplier_code')
                .eq('id', supplierId)
                .single();

            if (!supplierCheck) {
                throw new Error(`Supplier not found with ID: ${supplierId}`);
            }

            const userId = supplierCheck.user_id;

            const userData = {};
            const suppliersData = {};

         
            if (updateData.email !== undefined) {
                const { data: currentSupplier } = await supabase
                    .from('suppliers')
                    .select('users!suppliers_user_id_fkey(email)')
                    .eq('id', supplierId)
                    .single();

                const currentEmail = currentSupplier?.users?.email;
                if (updateData.email !== currentEmail) {
                    const existingUser = await User.findByEmail(updateData.email, false);
                    if (existingUser) {
                        throw new Error('Email already exists');
                    }
                }
                userData.email = updateData.email;
            }

            if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
            if (updateData.phone !== undefined) userData.phone = updateData.phone;
            if (updateData.role !== undefined) userData.role = updateData.role;
            if (updateData.status !== undefined) userData.status = updateData.status;

            if (updateData.supplier_code !== undefined) {
                if (updateData.supplier_code !== supplierCheck.supplier_code) {
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

          
            const updatePromises = [];
            if (Object.keys(userData).length > 0) {
                updatePromises.push(User.update(userId, userData));
            }
            if (Object.keys(suppliersData).length > 0) {
                updatePromises.push(Suppliers.update(supplierId, suppliersData));
            }

            await Promise.all(updatePromises);

            const updatedSupplier = await Suppliers.getSupplierById(supplierId);
            return updatedSupplier;
        } catch (error) {
            throw error;
        }
    }

    static async deleteSupplier(supplierId) {
        try {
          
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

    static async importSuppliers(csvContent, createdByUserId) {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV file must have at least a header row and one data row');
            }

            const headers = this.parseCSVLine(lines[0]);
            const headerMap = this.mapCSVHeaders(headers);

            const results = {
                total: 0,
                created: 0,
                updated: 0,
                errors: [],
                success: []
            };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                try {
                    const row = this.parseCSVLine(line);
                    
                    // Debug: Log header map for first row to help troubleshoot
                    if (i === 1) {
                        console.log('CSV Headers detected:', Object.keys(headerMap));
                    }
                    
                    const supplierData = this.mapCSVRowToSupplier(row, headerMap, createdByUserId);

                    if (!supplierData.full_name || !supplierData.email || !supplierData.company_name) {
                        results.errors.push({
                            row: i + 1,
                            error: 'Full name, email, and company name are required'
                        });
                        continue;
                    }

                    results.total++;

                    const existingSupplier = await Suppliers.findByIdOrCode(
                        supplierData.id,
                        supplierData.supplier_code,
                        supplierData.email
                    );

                    if (existingSupplier) {
                        const updateData = { ...supplierData };
                        delete updateData.id;
                        delete updateData.created_by;
                        delete updateData.created_at;

                        const updatedSupplier = await SuppliersService.updateSupplier(existingSupplier.id, updateData);
                        results.updated++;
                        results.success.push({
                            row: i + 1,
                            action: 'updated',
                            supplier_id: existingSupplier.id,
                            company_name: updatedSupplier.company_name
                        });
                    } else {
                        const newSupplier = await SuppliersService.createSuppliersWithUser(supplierData);
                        results.created++;
                        results.success.push({
                            row: i + 1,
                            action: 'created',
                            supplier_id: newSupplier.supplier.id,
                            company_name: newSupplier.supplier.company_name
                        });
                    }
                } catch (error) {
                    results.errors.push({
                        row: i + 1,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
                data: results
            };
        } catch (error) {
            throw error;
        }
    }

    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    static mapCSVHeaders(headers) {
        const map = {};
        headers.forEach((header, index) => {
            const normalized = header.trim().toLowerCase();
            map[normalized] = index;
            
            // Also map partial matches for truncated headers
            if (normalized.includes('supplier') && normalized.includes('id')) {
                map['supplier id'] = index;
                map['supplier_code'] = index;
            }
            if (normalized.includes('full') && normalized.includes('name')) {
                map['full name'] = index;
            }
            if (normalized.includes('company') && normalized.includes('name')) {
                map['company name'] = index;
            }
            if (normalized.includes('contact') && normalized.includes('person')) {
                map['contact person'] = index;
            }
            if (normalized.includes('contract') && normalized.includes('start')) {
                map['contract start'] = index;
            }
            if (normalized.includes('contract') && normalized.includes('end')) {
                map['contract end'] = index;
            }
            if (normalized.includes('total') && normalized.includes('order')) {
                map['total orders'] = index;
            }
        });
        return map;
    }

    static mapCSVRowToSupplier(row, headerMap, createdByUserId) {
        const getValue = (key) => {
            let index = headerMap[key];
            
            // If exact match not found, try partial matches
            if (index === undefined) {
                const matchingKey = Object.keys(headerMap).find(h => 
                    h.includes(key.toLowerCase()) || key.toLowerCase().includes(h)
                );
                if (matchingKey) {
                    index = headerMap[matchingKey];
                }
            }
            
            return index !== undefined && row[index] ? row[index].trim() : null;
        };

        const parseNumber = (value) => {
            if (!value) return null;
            const cleaned = value.toString().replace(/[^0-9.-]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        };

        const parseInteger = (value) => {
            if (!value) return null;
            const cleaned = value.toString().replace(/[^0-9]/g, '');
            const num = parseInt(cleaned);
            return isNaN(num) ? null : num;
        };

        const parseDate = (value) => {
            if (!value || value.trim() === '' || value.includes('########') || value.includes('#')) {
                return null;
            }
            
            // Try MM/DD/YYYY format (common in US Excel exports)
            let dateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
                const [, month, day, year] = dateMatch;
                const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            // Try DD-MM-YYYY format
            dateMatch = value.match(/(\d{2})-(\d{2})-(\d{4})/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch;
                const date = new Date(`${year}-${month}-${day}`);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            // Try YYYY-MM-DD format
            dateMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                const [, year, month, day] = dateMatch;
                const date = new Date(`${year}-${month}-${day}`);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            // Try to parse as ISO date
            const isoDate = new Date(value);
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toISOString().split('T')[0];
            }
            
            return null;
        };

        const extractSupplierCode = (value) => {
            if (!value) return null;
            const codeMatch = value.match(/(SUP-\d{4}-\d+)/);
            return codeMatch ? codeMatch[1] : null;
        };

        const supplierData = {};

        const id = getValue('id');
        if (id) {
            const parsedId = parseInteger(id);
            if (parsedId) supplierData.id = parsedId;
        }

        const supplierId = getValue('supplier id') || getValue('supplier_id');
        if (supplierId) {
            const code = extractSupplierCode(supplierId);
            if (code) {
                supplierData.supplier_code = code;
            }
        }

        const fullName = getValue('full name') || getValue('full_name');
        supplierData.full_name = fullName || null;

        supplierData.email = getValue('email') || null;
        
        const phone = getValue('phone');
        if (phone) {
            if (phone.includes('E+') || phone.includes('e+')) {
                const phoneNum = parseFloat(phone);
                if (!isNaN(phoneNum)) {
                    supplierData.phone = phoneNum.toFixed(0);
                } else {
                    supplierData.phone = phone;
                }
            } else {
                supplierData.phone = phone;
            }
        } else {
            supplierData.phone = null;
        }

        const companyName = getValue('company name') || getValue('company_name');
        supplierData.company_name = companyName || null;

        const contactPerson = getValue('contact person') || getValue('contact_person');
        supplierData.contact_person = contactPerson || null;

        supplierData.address = getValue('address') || null;

        const status = getValue('status');
        if (status) {
            supplierData.status = status.toLowerCase() === 'active' ? 'active' : 'inactive';
        } else {
            supplierData.status = 'active';
        }

        const contractStart = getValue('contract start') || getValue('contract_start');
        if (contractStart) {
            const parsedDate = parseDate(contractStart);
            supplierData.contract_start = parsedDate || null;
        } else {
            supplierData.contract_start = null;
        }

        const contractEnd = getValue('contract end') || getValue('contract_end');
        if (contractEnd) {
            const parsedDate = parseDate(contractEnd);
            supplierData.contract_end = parsedDate || null;
        } else {
            supplierData.contract_end = null;
        }

        supplierData.notes = getValue('notes') || null;

        supplierData.role = 'supplier';
        supplierData.management_type = 'supplier';

        return supplierData;
    }
}
