import { Product } from '../models/Product.js';
import { Suppliers } from '../models/Suppliers.js';
import { Configuration } from '../models/Configuration.js';
import { supabase } from '../config/database.js';
import { successResponse } from '../helpers/responseHelper.js';

export class ProductService {
  static async createProduct(productData, createdByUserId) {
    try {
      
      const checks = [];
      
      if (productData.supplier_id) {
     
        checks.push(
          supabase
            .from('suppliers')
            .select('id')
            .eq('id', productData.supplier_id)
            .single()
            .then(({ data, error }) => {
              if (error && error.code !== 'PGRST116') {
                throw new Error(`Database error: ${error.message}`);
              }
              if (!data) {
                throw new Error('Supplier not found');
              }
              return data;
            })
        );
      }


      if (productData.supplier_cost_price && !productData.markup_percentage) {
    
        checks.push(
          Configuration.getConfiguration()
            .then(config => {
              if (config && config.markup_percentage > 0) {
                productData.markup_percentage = config.markup_percentage;
              }
              return config;
            })
            .catch(error => {
              console.log('Could not fetch configuration for default markup:', error.message);
              return null;
            })
        );
      }

  
      if (checks.length > 0) {
        await Promise.all(checks);
      }

      if (productData.supplier_cost_price && productData.markup_percentage && !productData.markup_amount) {
        productData.markup_amount = (productData.supplier_cost_price * productData.markup_percentage) / 100;
      }

      if (productData.supplier_cost_price && productData.markup_amount && !productData.jdp_price) {
        productData.jdp_price = productData.supplier_cost_price + productData.markup_amount;
      }

      if (productData.jdp_price && productData.supplier_cost_price && !productData.profit_margin) {
        productData.profit_margin = ((productData.jdp_price - productData.supplier_cost_price) / productData.jdp_price) * 100;
      }

      const productWithCreator = {
        ...productData,
        created_by: createdByUserId
      };

      const product = await Product.create(productWithCreator);
      return {
        product,
        message: 'Product created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllProducts(page = 1, limit = 10, filters = {}) {
    try {
      const result = await Product.getAllProducts(page, limit, filters);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getCustomProducts(jobId = null, page = 1, limit = 10) {
    try {
      const result = await Product.getCustomProducts(jobId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getProductsByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Product.getProductsByJob(jobId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getProductById(productId) {
    try {
      const product = await Product.getProductById(productId);
      return product;
    } catch (error) {
      throw error;
    }
  }

  static async updateProduct(productId, updateData) {
    try {
   
      const checks = [];
      
      if (updateData.supplier_id) {
     
        checks.push(
          supabase
            .from('suppliers')
            .select('id')
            .eq('id', updateData.supplier_id)
            .single()
            .then(({ data, error }) => {
              if (error && error.code !== 'PGRST116') {
                throw new Error(`Database error: ${error.message}`);
              }
              if (!data) {
                throw new Error('Supplier not found');
              }
              return data;
            })
        );
      }

    
      if (updateData.supplier_cost_price || updateData.markup_percentage) {
     
        const productCheck = supabase
          .from('products')
          .select('supplier_cost_price, markup_percentage')
          .eq('id', productId)
          .single();
        
        checks.push(productCheck);
      }

     
      if (checks.length > 0) {
        const results = await Promise.all(checks);
      
        if (updateData.supplier_cost_price || updateData.markup_percentage) {
          const productResult = results[results.length - 1];
          
          if (productResult.error && productResult.error.code !== 'PGRST116') {
            throw new Error(`Database error: ${productResult.error.message}`);
          }
          if (!productResult.data) {
            throw new Error('Product not found');
          }
          
          const currentProduct = productResult.data;
          const costPrice = updateData.supplier_cost_price || currentProduct.supplier_cost_price;
          const markupPercentage = updateData.markup_percentage || currentProduct.markup_percentage;
          
          if (costPrice && markupPercentage) {
            updateData.markup_amount = (costPrice * markupPercentage) / 100;
            updateData.jdp_price = costPrice + updateData.markup_amount;
            updateData.profit_margin = ((updateData.jdp_price - costPrice) / updateData.jdp_price) * 100;
          }
        }
      }

      const updatedProduct = await Product.update(productId, updateData);
      return updatedProduct;
    } catch (error) {
      throw error;
    }
  }

  static async deleteProduct(productId) {
    try {
    
      const relationshipCheck = await Product.checkProductRelationships(productId);
      
      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this product because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      const result = await Product.delete(productId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getProductsBySupplier(supplierId, page = 1, limit = 10) {
    try {

      const { data: supplier, error: checkError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', supplierId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const result = await Product.getProductsBySupplier(supplierId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getProductCategories() {
    try {
      const categories = await Product.getProductCategories();
      return categories;
    } catch (error) {
      throw error;
    }
  }

  static async updateStock(productId, stockData) {
    try {
      const updatedProduct = await Product.updateStock(productId, stockData.stock_quantity);
      return {
        product: updatedProduct,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLowStockProducts(threshold = 10) {
    try {
      const products = await Product.getLowStockProducts(threshold);
      return {
        products,
        count: products.length,
        threshold,
        message: `Found ${products.length} products with stock below ${threshold}`
      };
    } catch (error) {
      throw error;
    }
  }

  static validateProductData(productData) {
    const errors = [];

    if (!productData.product_name) {
      errors.push('Product name is required');
    }

    if (productData.product_name && productData.product_name.length > 255) {
      errors.push('Product name must be less than 255 characters');
    }

    if (productData.supplier_id && !Number.isInteger(productData.supplier_id)) {
      errors.push('Supplier ID must be a valid integer');
    }

    if (productData.supplier_cost_price && productData.supplier_cost_price < 0) {
      errors.push('Supplier cost price cannot be negative');
    }

    if (productData.markup_percentage && (productData.markup_percentage < 0 || productData.markup_percentage > 100)) {
      errors.push('Markup percentage must be between 0 and 100');
    }

    if (productData.jdp_price && productData.jdp_price < 0) {
      errors.push('JDP price cannot be negative');
    }

    if (productData.stock_quantity && (productData.stock_quantity < 0 || !Number.isInteger(productData.stock_quantity))) {
      errors.push('Stock quantity must be a non-negative integer');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  static async calculateProductPricing(costPrice, markupPercentage) {
    try {
      const markupAmount = (costPrice * markupPercentage) / 100;
      const jdpPrice = costPrice + markupAmount;
      const profitMargin = (markupAmount / jdpPrice) * 100;

      return {
        supplier_cost_price: costPrice,
        markup_percentage: markupPercentage,
        markup_amount: Math.round(markupAmount * 100) / 100,
        jdp_price: Math.round(jdpPrice * 100) / 100,
        profit_margin: Math.round(profitMargin * 100) / 100
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProductStatistics() {
    try {
      const { data: allProducts } = await Product.getAllProducts(1, 1000);
      
      const totalProducts = allProducts.data.length;
      const totalStockValue = allProducts.data.reduce((sum, product) => {
        return sum + (product.stock_quantity * product.jdp_price || 0);
      }, 0);
      
      const lowStockCount = allProducts.data.filter(product => 
        product.stock_quantity <= 10
      ).length;

      const categories = await Product.getProductCategories();
      
      return {
        total_products: totalProducts,
        total_stock_value: Math.round(totalStockValue * 100) / 100,
        low_stock_count: lowStockCount,
        total_categories: categories.length,
        categories: categories
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProductStats() {
    try {
      const stats = await Product.getStats();

      return {
        success: true,
        message: 'Product statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      throw error;
    }
  }

  static async searchProducts(filters, pagination) {
    try {
      const result = await Product.search(filters, pagination);
      return successResponse(
        {
          products: result.products,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Products searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async importProducts(csvContent, createdByUserId) {
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
          const productData = this.mapCSVRowToProduct(row, headerMap, createdByUserId);

          if (!productData.product_name) {
            results.errors.push({
              row: i + 1,
              error: 'Product name is required'
            });
            continue;
          }

          results.total++;

          if (productData._supplier_name && !productData.supplier_id) {
            const supplier = await Suppliers.findByName(productData._supplier_name);
            if (supplier) {
              productData.supplier_id = supplier.id;
            }
            delete productData._supplier_name;
          }

          const existingProduct = await Product.findByIdOrSku(
            productData.id,
            productData.jdp_sku,
            productData.supplier_sku,
            productData.supplier_id
          );

          if (existingProduct) {
            const updateData = { ...productData };
            delete updateData.id;
            delete updateData.created_by;
            delete updateData.created_at;

            const updatedProduct = await ProductService.updateProduct(existingProduct.id, updateData);
            results.updated++;
            results.success.push({
              row: i + 1,
              action: 'updated',
              product_id: existingProduct.id,
              product_name: updatedProduct.product_name
            });
          } else {
            const newProduct = await ProductService.createProduct(productData, createdByUserId);
            results.created++;
            results.success.push({
              row: i + 1,
              action: 'created',
              product_id: newProduct.product.id,
              product_name: newProduct.product.product_name
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
    });
    return map;
  }

  static mapCSVRowToProduct(row, headerMap, createdByUserId) {
    const getValue = (key) => {
      const index = headerMap[key];
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
      if (!value) return null;
      const dateMatch = value.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
      return null;
    };

    const parsePercentage = (value) => {
      if (!value) return null;
      const cleaned = value.toString().replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    const productData = {
      created_by: createdByUserId
    };

    const id = getValue('id');
    if (id) {
      const parsedId = parseInteger(id);
      if (parsedId) productData.id = parsedId;
    }

    productData.product_name = getValue('name') || null;
    productData.category = getValue('category') || null;
    
    const supplierId = getValue('supplier id') || getValue('supplier_id');
    if (supplierId) {
      const parsedSupplierId = parseInteger(supplierId);
      if (parsedSupplierId) productData.supplier_id = parsedSupplierId;
    } else {
      const supplierName = getValue('supplier');
      if (supplierName && !supplierName.toLowerCase().includes('unknown')) {
        productData._supplier_name = supplierName;
      }
    }

    productData.supplier_sku = getValue('supplier sku') || getValue('supplier_sku') || null;
    productData.jdp_sku = getValue('jdp sku') || getValue('jdp_sku') || null;
    
    const unitCost = getValue('unit cost') || getValue('unit_cost');
    if (unitCost) {
      productData.supplier_cost_price = parseNumber(unitCost);
    }

    const markupPercent = getValue('markup percentage') || getValue('markup_percentage');
    if (markupPercent) {
      productData.markup_percentage = parsePercentage(markupPercent);
    }

    const markupAmount = getValue('markup amount') || getValue('markup_amount');
    if (markupAmount) {
      productData.markup_amount = parseNumber(markupAmount);
    }

    const jdpPrice = getValue('jdp price') || getValue('jdp_price');
    if (jdpPrice) {
      productData.jdp_price = parseNumber(jdpPrice);
    }

    const stockQty = getValue('stock quantity') || getValue('stock_quantity');
    if (stockQty) {
      productData.stock_quantity = parseInteger(stockQty);
    }

    productData.status = (getValue('status') || 'active').toLowerCase();
    if (!['active', 'inactive', 'draft'].includes(productData.status)) {
      productData.status = 'active';
    }

    productData.description = getValue('description') || null;

    const createdDate = getValue('created date') || getValue('created_date');
    if (createdDate) {
      const parsedDate = parseDate(createdDate);
      if (parsedDate) productData.created_at = parsedDate;
    }

    const estimatedPrice = getValue('estimated price') || getValue('estimated_price');
    if (estimatedPrice) {
      productData.estimated_price = parseNumber(estimatedPrice);
    }

    return productData;
  }
}
