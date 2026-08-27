const z = require('../utils/zod');

const addItemSchema = {
  body: z.object({
    item_name: z.string().trim().min(1, 'Item name is required'),
    price: z.coerce.number().positive('Item price must be a positive number'),
    description: z.string().trim().optional(),
    stock: z.coerce.number().min(0, 'Stock cannot be negative').optional(),
    category: z.string().trim().optional(),
    unit: z.string().trim().optional(),
    is_available: z.coerce.boolean().optional(),
    image_url: z.string().trim().optional()
  })
};

const updateSettingsSchema = {
  body: z.object({
    store_name: z.string().trim().min(1, 'Store name is required').optional(),
    logo: z.string().trim().optional(),
    description: z.string().trim().optional(),
    phone_number: z.string().trim().optional(),
    gst_number: z.string().trim().optional(),
    opening_timing: z.string().trim().optional(),
    closing_timing: z.string().trim().optional(),
    min_order_value: z.coerce.number().min(0).optional(),
    max_quantity_limit: z.coerce.number().min(1).optional(),
    delivery_charge: z.coerce.number().min(0).optional(),
    gst_percentage: z.coerce.number().min(0).optional(),
    service_charge_percentage: z.coerce.number().min(0).optional(),
    vendor_type: z.enum(['product', 'service']).optional(),
    location_type: z.enum(['society', 'area_sector']).optional(),
    is_global_coverage: z.boolean().optional(),
    delivery_radius_km: z.coerce.number().min(0).optional(),
    selected_zones: z.array(z.any()).optional()
  })
};

const updateCoverageSchema = {
  body: z.object({
    location_type: z.enum(['society', 'area_sector']).optional(),
    is_global_coverage: z.boolean().optional(),
    delivery_radius_km: z.coerce.number().min(0).optional(),
    selected_zones: z.array(z.object({
      zone_id: z.union([z.string(), z.number()]).optional(),
      name: z.string().trim().min(1),
      type: z.enum(['society', 'sector', 'sub_area']).optional(),
      is_active: z.boolean().default(true)
    })).optional()
  })
};

const checkCoverageSchema = {
  body: z.object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    radius_km: z.coerce.number().min(0.1).default(3),
    sector: z.string().trim().optional(),
    location_type: z.enum(['society', 'area_sector']).optional()
  })
};

const serviceEnquirySchema = {
  body: z.object({
    vendor_id: z.union([z.string(), z.number()]),
    user_name: z.string().trim().min(1, 'User name is required'),
    user_phone: z.string().trim().min(10, 'Valid phone number is required'),
    user_id: z.string().trim().optional(),
    society_id: z.union([z.string(), z.number()]).optional(),
    society_name: z.string().trim().optional(),
    sector: z.string().trim().optional(),
    service_type: z.string().trim().optional(),
    preferred_time: z.string().trim().optional(),
    description: z.string().trim().optional(),
    issue_photos: z.array(z.string()).optional()
  })
};

module.exports = {
  addItemSchema,
  updateSettingsSchema,
  updateCoverageSchema,
  checkCoverageSchema,
  serviceEnquirySchema
};
