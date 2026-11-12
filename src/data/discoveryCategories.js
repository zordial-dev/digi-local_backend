'use strict';

/**
 * Justdial-Style Platform Categories and Subcategories
 */

const DISCOVERY_CATEGORIES = [
  {
    name: 'Restaurants & Food',
    slug: 'restaurants',
    type: 'product',
    icon_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    display_order: 1,
    subcategories: [
      { name: 'Fast Food', slug: 'fast-food' },
      { name: 'Cafes & Bakeries', slug: 'cafes-bakeries' },
      { name: 'Meals & Thali', slug: 'meals-thali' },
      { name: 'Sweets & Desserts', slug: 'sweets-desserts' },
      { name: 'Beverages & Juices', slug: 'beverages-juices' }
    ]
  },
  {
    name: 'Grocery & Essentials',
    slug: 'grocery',
    type: 'product',
    icon_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120',
    image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600',
    display_order: 2,
    subcategories: [
      { name: 'Vegetables & Fruits', slug: 'vegetables-fruits' },
      { name: 'Daily Essentials & Staples', slug: 'daily-essentials' },
      { name: 'Dairy & Bakery', slug: 'dairy-bakery' },
      { name: 'Snacks & Packaged Food', slug: 'snacks-packaged-food' },
      { name: 'Organic & Dry Fruits', slug: 'organic-dry-fruits' }
    ]
  },
  {
    name: 'Healthcare & Doctors',
    slug: 'healthcare',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=120',
    image_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600',
    display_order: 3,
    subcategories: [
      { name: 'Clinics & General Physicians', slug: 'clinics-doctors' },
      { name: 'Dental Care & RCT', slug: 'dental-care' },
      { name: 'Pharmacies & Chemists', slug: 'pharmacy-chemist' },
      { name: 'Diagnostic Labs & Pathology', slug: 'diagnostic-labs' }
    ]
  },
  {
    name: 'Home Services & Repairs',
    slug: 'repair-services',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=120',
    image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
    display_order: 4,
    subcategories: [
      { name: 'Electrician & Wiring', slug: 'electrician' },
      { name: 'Plumbing & Sanitary Works', slug: 'plumbing' },
      { name: 'AC Cleaning & Repair', slug: 'ac-repair' },
      { name: 'Housekeeping & Deep Cleaning', slug: 'deep-cleaning' },
      { name: 'Appliance Repair', slug: 'appliance-repair' }
    ]
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-spa',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=120',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
    display_order: 5,
    subcategories: [
      { name: 'Salons & Hair Care', slug: 'salons-hair' },
      { name: 'Spa & Massage Centers', slug: 'spa-massage' },
      { name: 'Bridal & Makeup Artists', slug: 'bridal-makeup' },
      { name: 'Skincare & Dermatology', slug: 'skincare' }
    ]
  },
  {
    name: 'Home Decor & Handicrafts',
    slug: 'home-decor',
    type: 'product',
    icon_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=120',
    image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600',
    display_order: 6,
    subcategories: [
      { name: 'Resin Art & Custom Gifts', slug: 'resin-art-gifts' },
      { name: 'Handicrafts & Souvenirs', slug: 'handicrafts' },
      { name: 'Furniture & Living Decor', slug: 'furniture-decor' },
      { name: 'Lighting & Wall Decor', slug: 'lighting-wall-decor' }
    ]
  },
  {
    name: 'Electronics & Gadgets',
    slug: 'electronics',
    type: 'product',
    icon_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120',
    image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
    display_order: 7,
    subcategories: [
      { name: 'Mobile Phones & Accessories', slug: 'mobile-phones' },
      { name: 'Computers & Peripherals', slug: 'computers-peripherals' },
      { name: 'Home Appliances', slug: 'home-appliances' },
      { name: 'Gadget Repairs', slug: 'gadget-repairs' }
    ]
  },
  {
    name: 'Education & Coaching',
    slug: 'education',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120',
    image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600',
    display_order: 8,
    subcategories: [
      { name: 'School & College Tuitions', slug: 'tuitions' },
      { name: 'Competitive Exams Coaching', slug: 'exam-coaching' },
      { name: 'Language & Coding Classes', slug: 'language-coding' },
      { name: 'Music & Dance Academies', slug: 'music-dance' }
    ]
  },
  {
    name: 'Fitness & Sports',
    slug: 'fitness',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=120',
    image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600',
    display_order: 9,
    subcategories: [
      { name: 'Gyms & Fitness Centers', slug: 'gyms' },
      { name: 'Yoga & Meditation', slug: 'yoga' },
      { name: 'Swimming & Sports Clubs', slug: 'sports-clubs' }
    ]
  },
  {
    name: 'CA, Tax & Legal Services',
    slug: 'legal-financial',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=120',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
    display_order: 10,
    subcategories: [
      { name: 'Chartered Accountants (CA)', slug: 'chartered-accountants' },
      { name: 'GST & Income Tax Filing', slug: 'gst-income-tax' },
      { name: 'Advocates & Legal Advisors', slug: 'advocates-legal' },
      { name: 'Business Registration & IP', slug: 'business-registration' }
    ]
  },
  {
    name: 'Pet Care & Veterinary',
    slug: 'pet-care',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=120',
    image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600',
    display_order: 11,
    subcategories: [
      { name: 'Veterinary Clinics & Doctors', slug: 'veterinary-doctors' },
      { name: 'Pet Grooming & Spa', slug: 'pet-grooming' },
      { name: 'Pet Food & Supplies', slug: 'pet-food-supplies' }
    ]
  },
  {
    name: 'Travel & Transport',
    slug: 'travel',
    type: 'service',
    icon_url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=120',
    image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
    display_order: 12,
    subcategories: [
      { name: 'Taxi & Car Rentals', slug: 'taxi-car-rental' },
      { name: 'Tour & Travel Agents', slug: 'tour-travel-agents' },
      { name: 'Packers & Movers', slug: 'packers-movers' }
    ]
  }
];

module.exports = {
  DISCOVERY_CATEGORIES
};

