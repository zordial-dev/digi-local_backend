'use strict';

/**
 * Comprehensive India Cities Dataset
 * Covering all 28 Indian States and 8 Union Territories.
 * Each entry provides:
 * - name: City Name
 * - slug: URL-safe unique slug
 * - state: Full State Name
 * - state_code: Two-letter ISO State Code
 * - country: "India"
 * - sort_order: 1 for Tier-1/metro/popular discovery hubs, 10 for other cities
 */

const INDIA_CITIES = [
  // Top Metros & Major Commercial Hubs
  { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', state_code: 'MH', sort_order: 1 },
  { name: 'Delhi', slug: 'delhi', state: 'Delhi', state_code: 'DL', sort_order: 1 },
  { name: 'Bengaluru', slug: 'bengaluru', state: 'Karnataka', state_code: 'KA', sort_order: 1 },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', state_code: 'TS', sort_order: 1 },
  { name: 'Ahmedabad', slug: 'ahmedabad', state: 'Gujarat', state_code: 'GJ', sort_order: 1 },
  { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu', state_code: 'TN', sort_order: 1 },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', state_code: 'WB', sort_order: 1 },
  { name: 'Pune', slug: 'pune', state: 'Maharashtra', state_code: 'MH', sort_order: 1 },
  { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan', state_code: 'RJ', sort_order: 1 },
  { name: 'Noida', slug: 'noida', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 1 },
  { name: 'Greater Noida', slug: 'greater-noida', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 1 },
  { name: 'Gurugram', slug: 'gurugram', state: 'Haryana', state_code: 'HR', sort_order: 1 },
  { name: 'Chandigarh', slug: 'chandigarh', state: 'Chandigarh', state_code: 'CH', sort_order: 1 },
  { name: 'Lucknow', slug: 'lucknow', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 1 },
  { name: 'Indore', slug: 'indore', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 1 },
  { name: 'Kochi', slug: 'kochi', state: 'Kerala', state_code: 'KL', sort_order: 1 },
  { name: 'Surat', slug: 'surat', state: 'Gujarat', state_code: 'GJ', sort_order: 1 },

  // Andhra Pradesh (AP)
  { name: 'Visakhapatnam', slug: 'visakhapatnam', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 2 },
  { name: 'Vijayawada', slug: 'vijayawada', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 2 },
  { name: 'Guntur', slug: 'guntur', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Nellore', slug: 'nellore', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Kurnool', slug: 'kurnool', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Rajahmundry', slug: 'rajahmundry', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Tirupati', slug: 'tirupati', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 2 },
  { name: 'Kakinada', slug: 'kakinada', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Anantapur', slug: 'anantapur', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Kadapa', slug: 'kadapa', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Eluru', slug: 'eluru', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },
  { name: 'Ongole', slug: 'ongole', state: 'Andhra Pradesh', state_code: 'AP', sort_order: 10 },

  // Arunachal Pradesh (AR)
  { name: 'Itanagar', slug: 'itanagar', state: 'Arunachal Pradesh', state_code: 'AR', sort_order: 5 },
  { name: 'Naharlagun', slug: 'naharlagun', state: 'Arunachal Pradesh', state_code: 'AR', sort_order: 10 },
  { name: 'Pasighat', slug: 'pasighat', state: 'Arunachal Pradesh', state_code: 'AR', sort_order: 10 },
  { name: 'Tawang', slug: 'tawang', state: 'Arunachal Pradesh', state_code: 'AR', sort_order: 10 },
  { name: 'Ziro', slug: 'ziro', state: 'Arunachal Pradesh', state_code: 'AR', sort_order: 10 },

  // Assam (AS)
  { name: 'Guwahati', slug: 'guwahati', state: 'Assam', state_code: 'AS', sort_order: 2 },
  { name: 'Silchar', slug: 'silchar', state: 'Assam', state_code: 'AS', sort_order: 10 },
  { name: 'Dibrugarh', slug: 'dibrugarh', state: 'Assam', state_code: 'AS', sort_order: 10 },
  { name: 'Jorhat', slug: 'jorhat', state: 'Assam', state_code: 'AS', sort_order: 10 },
  { name: 'Nagaon', slug: 'nagaon', state: 'Assam', state_code: 'AS', sort_order: 10 },
  { name: 'Tinsukia', slug: 'tinsukia', state: 'Assam', state_code: 'AS', sort_order: 10 },
  { name: 'Tezpur', slug: 'tezpur', state: 'Assam', state_code: 'AS', sort_order: 10 },

  // Bihar (BR)
  { name: 'Patna', slug: 'patna', state: 'Bihar', state_code: 'BR', sort_order: 2 },
  { name: 'Gaya', slug: 'gaya', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Bhagalpur', slug: 'bhagalpur', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Muzaffarpur', slug: 'muzaffarpur', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Purnia', slug: 'purnia', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Darbhanga', slug: 'darbhanga', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Bihar Sharif', slug: 'bihar-sharif', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Arrah', slug: 'arrah', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Begusarai', slug: 'begusarai', state: 'Bihar', state_code: 'BR', sort_order: 10 },
  { name: 'Katihar', slug: 'katihar', state: 'Bihar', state_code: 'BR', sort_order: 10 },

  // Chhattisgarh (CG)
  { name: 'Raipur', slug: 'raipur', state: 'Chhattisgarh', state_code: 'CG', sort_order: 2 },
  { name: 'Bhilai', slug: 'bhilai', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },
  { name: 'Bilaspur', slug: 'bilaspur-cg', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },
  { name: 'Korba', slug: 'korba', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },
  { name: 'Durg', slug: 'durg', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },
  { name: 'Rajnandgaon', slug: 'rajnandgaon', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },
  { name: 'Jagdalpur', slug: 'jagdalpur', state: 'Chhattisgarh', state_code: 'CG', sort_order: 10 },

  // Goa (GA)
  { name: 'Panaji', slug: 'panaji', state: 'Goa', state_code: 'GA', sort_order: 3 },
  { name: 'Margao', slug: 'margao', state: 'Goa', state_code: 'GA', sort_order: 10 },
  { name: 'Vasco da Gama', slug: 'vasco-da-gama', state: 'Goa', state_code: 'GA', sort_order: 10 },
  { name: 'Mapusa', slug: 'mapusa', state: 'Goa', state_code: 'GA', sort_order: 10 },
  { name: 'Ponda', slug: 'ponda', state: 'Goa', state_code: 'GA', sort_order: 10 },

  // Gujarat (GJ)
  { name: 'Vadodara', slug: 'vadodara', state: 'Gujarat', state_code: 'GJ', sort_order: 2 },
  { name: 'Rajkot', slug: 'rajkot', state: 'Gujarat', state_code: 'GJ', sort_order: 2 },
  { name: 'Bhavnagar', slug: 'bhavnagar', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Jamnagar', slug: 'jamnagar', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Gandhinagar', slug: 'gandhinagar', state: 'Gujarat', state_code: 'GJ', sort_order: 2 },
  { name: 'Junagadh', slug: 'junagadh', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Anand', slug: 'anand', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Navsari', slug: 'navsari', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Morbi', slug: 'morbi', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },
  { name: 'Bharuch', slug: 'bharuch', state: 'Gujarat', state_code: 'GJ', sort_order: 10 },

  // Haryana (HR)
  { name: 'Faridabad', slug: 'faridabad', state: 'Haryana', state_code: 'HR', sort_order: 2 },
  { name: 'Panipat', slug: 'panipat', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Ambala', slug: 'ambala', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Yamunanagar', slug: 'yamunanagar', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Rohtak', slug: 'rohtak', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Hisar', slug: 'hisar', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Karnal', slug: 'karnal', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Sonipat', slug: 'sonipat', state: 'Haryana', state_code: 'HR', sort_order: 10 },
  { name: 'Panchkula', slug: 'panchkula', state: 'Haryana', state_code: 'HR', sort_order: 5 },

  // Himachal Pradesh (HP)
  { name: 'Shimla', slug: 'shimla', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 3 },
  { name: 'Dharamshala', slug: 'dharamshala', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 5 },
  { name: 'Mandi', slug: 'mandi', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 10 },
  { name: 'Solan', slug: 'solan', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 10 },
  { name: 'Kullu', slug: 'kullu', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 10 },
  { name: 'Manali', slug: 'manali', state: 'Himachal Pradesh', state_code: 'HP', sort_order: 5 },

  // Jharkhand (JH)
  { name: 'Ranchi', slug: 'ranchi', state: 'Jharkhand', state_code: 'JH', sort_order: 2 },
  { name: 'Jamshedpur', slug: 'jamshedpur', state: 'Jharkhand', state_code: 'JH', sort_order: 2 },
  { name: 'Dhanbad', slug: 'dhanbad', state: 'Jharkhand', state_code: 'JH', sort_order: 10 },
  { name: 'Bokaro', slug: 'bokaro', state: 'Jharkhand', state_code: 'JH', sort_order: 10 },
  { name: 'Deoghar', slug: 'deoghar', state: 'Jharkhand', state_code: 'JH', sort_order: 10 },
  { name: 'Hazaribagh', slug: 'hazaribagh', state: 'Jharkhand', state_code: 'JH', sort_order: 10 },

  // Karnataka (KA)
  { name: 'Mysuru', slug: 'mysuru', state: 'Karnataka', state_code: 'KA', sort_order: 2 },
  { name: 'Mangaluru', slug: 'mangaluru', state: 'Karnataka', state_code: 'KA', sort_order: 2 },
  { name: 'Hubballi-Dharwad', slug: 'hubballi-dharwad', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Belagavi', slug: 'belagavi', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Kalaburagi', slug: 'kalaburagi', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Davanagere', slug: 'davanagere', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Ballari', slug: 'ballari', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Shivamogga', slug: 'shivamogga', state: 'Karnataka', state_code: 'KA', sort_order: 10 },
  { name: 'Udupi', slug: 'udupi', state: 'Karnataka', state_code: 'KA', sort_order: 10 },

  // Kerala (KL)
  { name: 'Thiruvananthapuram', slug: 'thiruvananthapuram', state: 'Kerala', state_code: 'KL', sort_order: 2 },
  { name: 'Kozhikode', slug: 'kozhikode', state: 'Kerala', state_code: 'KL', sort_order: 2 },
  { name: 'Thrissur', slug: 'thrissur', state: 'Kerala', state_code: 'KL', sort_order: 10 },
  { name: 'Kollam', slug: 'kollam', state: 'Kerala', state_code: 'KL', sort_order: 10 },
  { name: 'Kannur', slug: 'kannur', state: 'Kerala', state_code: 'KL', sort_order: 10 },
  { name: 'Alappuzha', slug: 'alappuzha', state: 'Kerala', state_code: 'KL', sort_order: 10 },
  { name: 'Kottayam', slug: 'kottayam', state: 'Kerala', state_code: 'KL', sort_order: 10 },
  { name: 'Palakkad', slug: 'palakkad', state: 'Kerala', state_code: 'KL', sort_order: 10 },

  // Madhya Pradesh (MP)
  { name: 'Bhopal', slug: 'bhopal', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 2 },
  { name: 'Gwalior', slug: 'gwalior', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 2 },
  { name: 'Jabalpur', slug: 'jabalpur', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 2 },
  { name: 'Ujjain', slug: 'ujjain', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },
  { name: 'Sagar', slug: 'sagar', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },
  { name: 'Dewas', slug: 'dewas', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },
  { name: 'Satna', slug: 'satna', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },
  { name: 'Ratlam', slug: 'ratlam', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },
  { name: 'Rewa', slug: 'rewa', state: 'Madhya Pradesh', state_code: 'MP', sort_order: 10 },

  // Maharashtra (MH)
  { name: 'Nagpur', slug: 'nagpur', state: 'Maharashtra', state_code: 'MH', sort_order: 2 },
  { name: 'Nashik', slug: 'nashik', state: 'Maharashtra', state_code: 'MH', sort_order: 2 },
  { name: 'Thane', slug: 'thane', state: 'Maharashtra', state_code: 'MH', sort_order: 2 },
  { name: 'Navi Mumbai', slug: 'navi-mumbai', state: 'Maharashtra', state_code: 'MH', sort_order: 2 },
  { name: 'Aurangabad (Chhatrapati Sambhajinagar)', slug: 'aurangabad', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Solapur', slug: 'solapur', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Kolhapur', slug: 'kolhapur', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Amravati', slug: 'amravati', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Nanded', slug: 'nanded', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Sangli', slug: 'sangli', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Jalgaon', slug: 'jalgaon', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },
  { name: 'Akola', slug: 'akola', state: 'Maharashtra', state_code: 'MH', sort_order: 10 },

  // Manipur (MN)
  { name: 'Imphal', slug: 'imphal', state: 'Manipur', state_code: 'MN', sort_order: 5 },
  { name: 'Thoubal', slug: 'thoubal', state: 'Manipur', state_code: 'MN', sort_order: 10 },
  { name: 'Bishnupur', slug: 'bishnupur', state: 'Manipur', state_code: 'MN', sort_order: 10 },
  { name: 'Churachandpur', slug: 'churachandpur', state: 'Manipur', state_code: 'MN', sort_order: 10 },

  // Meghalaya (ML)
  { name: 'Shillong', slug: 'shillong', state: 'Meghalaya', state_code: 'ML', sort_order: 3 },
  { name: 'Tura', slug: 'tura', state: 'Meghalaya', state_code: 'ML', sort_order: 10 },
  { name: 'Jowai', slug: 'jowai', state: 'Meghalaya', state_code: 'ML', sort_order: 10 },
  { name: 'Cherrapunji', slug: 'cherrapunji', state: 'Meghalaya', state_code: 'ML', sort_order: 10 },

  // Mizoram (MZ)
  { name: 'Aizawl', slug: 'aizawl', state: 'Mizoram', state_code: 'MZ', sort_order: 5 },
  { name: 'Lunglei', slug: 'lunglei', state: 'Mizoram', state_code: 'MZ', sort_order: 10 },
  { name: 'Champhai', slug: 'champhai', state: 'Mizoram', state_code: 'MZ', sort_order: 10 },

  // Nagaland (NL)
  { name: 'Kohima', slug: 'kohima', state: 'Nagaland', state_code: 'NL', sort_order: 5 },
  { name: 'Dimapur', slug: 'dimapur', state: 'Nagaland', state_code: 'NL', sort_order: 5 },
  { name: 'Mokokchung', slug: 'mokokchung', state: 'Nagaland', state_code: 'NL', sort_order: 10 },

  // Odisha (OD)
  { name: 'Bhubaneswar', slug: 'bhubaneswar', state: 'Odisha', state_code: 'OD', sort_order: 2 },
  { name: 'Cuttack', slug: 'cuttack', state: 'Odisha', state_code: 'OD', sort_order: 2 },
  { name: 'Rourkela', slug: 'rourkela', state: 'Odisha', state_code: 'OD', sort_order: 10 },
  { name: 'Berhampur', slug: 'berhampur', state: 'Odisha', state_code: 'OD', sort_order: 10 },
  { name: 'Sambalpur', slug: 'sambalpur', state: 'Odisha', state_code: 'OD', sort_order: 10 },
  { name: 'Puri', slug: 'puri', state: 'Odisha', state_code: 'OD', sort_order: 5 },
  { name: 'Balasore', slug: 'balasore', state: 'Odisha', state_code: 'OD', sort_order: 10 },

  // Punjab (PB)
  { name: 'Ludhiana', slug: 'ludhiana', state: 'Punjab', state_code: 'PB', sort_order: 2 },
  { name: 'Amritsar', slug: 'amritsar', state: 'Punjab', state_code: 'PB', sort_order: 2 },
  { name: 'Jalandhar', slug: 'jalandhar', state: 'Punjab', state_code: 'PB', sort_order: 2 },
  { name: 'Patiala', slug: 'patiala', state: 'Punjab', state_code: 'PB', sort_order: 10 },
  { name: 'Bathinda', slug: 'bathinda', state: 'Punjab', state_code: 'PB', sort_order: 10 },
  { name: 'Mohali', slug: 'mohali', state: 'Punjab', state_code: 'PB', sort_order: 2 },
  { name: 'Pathankot', slug: 'pathankot', state: 'Punjab', state_code: 'PB', sort_order: 10 },

  // Rajasthan (RJ)
  { name: 'Jodhpur', slug: 'jodhpur', state: 'Rajasthan', state_code: 'RJ', sort_order: 2 },
  { name: 'Kota', slug: 'kota', state: 'Rajasthan', state_code: 'RJ', sort_order: 2 },
  { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan', state_code: 'RJ', sort_order: 2 },
  { name: 'Bikaner', slug: 'bikaner', state: 'Rajasthan', state_code: 'RJ', sort_order: 5 },
  { name: 'Ajmer', slug: 'ajmer', state: 'Rajasthan', state_code: 'RJ', sort_order: 5 },
  { name: 'Bhilwara', slug: 'bhilwara', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Alwar', slug: 'alwar', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Bharatpur', slug: 'bharatpur', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Sikar', slug: 'sikar', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Pali', slug: 'pali', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Sri Ganganagar', slug: 'sri-ganganagar', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Hanumangarh', slug: 'hanumangarh', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Sawai Madhopur', slug: 'sawai-madhopur', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },
  { name: 'Chittorgarh', slug: 'chittorgarh', state: 'Rajasthan', state_code: 'RJ', sort_order: 10 },

  // Sikkim (SK)
  { name: 'Gangtok', slug: 'gangtok', state: 'Sikkim', state_code: 'SK', sort_order: 3 },
  { name: 'Namchi', slug: 'namchi', state: 'Sikkim', state_code: 'SK', sort_order: 10 },
  { name: 'Geyzing', slug: 'geyzing', state: 'Sikkim', state_code: 'SK', sort_order: 10 },

  // Tamil Nadu (TN)
  { name: 'Coimbatore', slug: 'coimbatore', state: 'Tamil Nadu', state_code: 'TN', sort_order: 2 },
  { name: 'Madurai', slug: 'madurai', state: 'Tamil Nadu', state_code: 'TN', sort_order: 2 },
  { name: 'Tiruchirappalli', slug: 'tiruchirappalli', state: 'Tamil Nadu', state_code: 'TN', sort_order: 5 },
  { name: 'Salem', slug: 'salem', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Tirunelveli', slug: 'tirunelveli', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Tiruppur', slug: 'tiruppur', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Vellore', slug: 'vellore', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Erode', slug: 'erode', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Thoothukudi', slug: 'thoothukudi', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Dindigul', slug: 'dindigul', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },
  { name: 'Thanjavur', slug: 'thanjavur', state: 'Tamil Nadu', state_code: 'TN', sort_order: 10 },

  // Telangana (TS)
  { name: 'Warangal', slug: 'warangal', state: 'Telangana', state_code: 'TS', sort_order: 2 },
  { name: 'Nizamabad', slug: 'nizamabad', state: 'Telangana', state_code: 'TS', sort_order: 10 },
  { name: 'Karimnagar', slug: 'karimnagar', state: 'Telangana', state_code: 'TS', sort_order: 10 },
  { name: 'Khammam', slug: 'khammam', state: 'Telangana', state_code: 'TS', sort_order: 10 },
  { name: 'Ramagundam', slug: 'ramagundam', state: 'Telangana', state_code: 'TS', sort_order: 10 },
  { name: 'Mahbubnagar', slug: 'mahbubnagar', state: 'Telangana', state_code: 'TS', sort_order: 10 },

  // Tripura (TR)
  { name: 'Agartala', slug: 'agartala', state: 'Tripura', state_code: 'TR', sort_order: 5 },
  { name: 'Dharmanagar', slug: 'dharmanagar', state: 'Tripura', state_code: 'TR', sort_order: 10 },
  { name: 'Udaipur', slug: 'udaipur-tr', state: 'Tripura', state_code: 'TR', sort_order: 10 },

  // Uttar Pradesh (UP)
  { name: 'Kanpur', slug: 'kanpur', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Ghaziabad', slug: 'ghaziabad', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Agra', slug: 'agra', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Meerut', slug: 'meerut', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Prayagraj (Allahabad)', slug: 'prayagraj', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 2 },
  { name: 'Bareilly', slug: 'bareilly', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },
  { name: 'Aligarh', slug: 'aligarh', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },
  { name: 'Moradabad', slug: 'moradabad', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },
  { name: 'Saharanpur', slug: 'saharanpur', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },
  { name: 'Gorakhpur', slug: 'gorakhpur', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 5 },
  { name: 'Mathura', slug: 'mathura', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },
  { name: 'Ayodhya', slug: 'ayodhya', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 5 },
  { name: 'Jhansi', slug: 'jhansi', state: 'Uttar Pradesh', state_code: 'UP', sort_order: 10 },

  // Uttarakhand (UK)
  { name: 'Dehradun', slug: 'dehradun', state: 'Uttarakhand', state_code: 'UK', sort_order: 2 },
  { name: 'Haridwar', slug: 'haridwar', state: 'Uttarakhand', state_code: 'UK', sort_order: 5 },
  { name: 'Rishikesh', slug: 'rishikesh', state: 'Uttarakhand', state_code: 'UK', sort_order: 5 },
  { name: 'Haldwani', slug: 'haldwani', state: 'Uttarakhand', state_code: 'UK', sort_order: 10 },
  { name: 'Roorkee', slug: 'roorkee', state: 'Uttarakhand', state_code: 'UK', sort_order: 10 },
  { name: 'Nainital', slug: 'nainital', state: 'Uttarakhand', state_code: 'UK', sort_order: 10 },

  // West Bengal (WB)
  { name: 'Howrah', slug: 'howrah', state: 'West Bengal', state_code: 'WB', sort_order: 2 },
  { name: 'Siliguri', slug: 'siliguri', state: 'West Bengal', state_code: 'WB', sort_order: 2 },
  { name: 'Durgapur', slug: 'durgapur', state: 'West Bengal', state_code: 'WB', sort_order: 10 },
  { name: 'Asansol', slug: 'asansol', state: 'West Bengal', state_code: 'WB', sort_order: 10 },
  { name: 'Bardhaman', slug: 'bardhaman', state: 'West Bengal', state_code: 'WB', sort_order: 10 },
  { name: 'Kharagpur', slug: 'kharagpur', state: 'West Bengal', state_code: 'WB', sort_order: 10 },
  { name: 'Darjeeling', slug: 'darjeeling', state: 'West Bengal', state_code: 'WB', sort_order: 5 },

  // Union Territory: Andaman & Nicobar Islands (AN)
  { name: 'Port Blair', slug: 'port-blair', state: 'Andaman and Nicobar Islands', state_code: 'AN', sort_order: 5 },

  // Union Territory: Dadra and Nagar Haveli and Daman and Diu (DN)
  { name: 'Daman', slug: 'daman', state: 'Dadra and Nagar Haveli and Daman and Diu', state_code: 'DN', sort_order: 10 },
  { name: 'Diu', slug: 'diu', state: 'Dadra and Nagar Haveli and Daman and Diu', state_code: 'DN', sort_order: 10 },
  { name: 'Silvassa', slug: 'silvassa', state: 'Dadra and Nagar Haveli and Daman and Diu', state_code: 'DN', sort_order: 10 },

  // Union Territory: Jammu & Kashmir (JK)
  { name: 'Srinagar', slug: 'srinagar', state: 'Jammu and Kashmir', state_code: 'JK', sort_order: 2 },
  { name: 'Jammu', slug: 'jammu', state: 'Jammu and Kashmir', state_code: 'JK', sort_order: 2 },
  { name: 'Anantnag', slug: 'anantnag', state: 'Jammu and Kashmir', state_code: 'JK', sort_order: 10 },
  { name: 'Baramulla', slug: 'baramulla', state: 'Jammu and Kashmir', state_code: 'JK', sort_order: 10 },

  // Union Territory: Ladakh (LA)
  { name: 'Leh', slug: 'leh', state: 'Ladakh', state_code: 'LA', sort_order: 5 },
  { name: 'Kargil', slug: 'kargil', state: 'Ladakh', state_code: 'LA', sort_order: 10 },

  // Union Territory: Lakshadweep (LD)
  { name: 'Kavaratti', slug: 'kavaratti', state: 'Lakshadweep', state_code: 'LD', sort_order: 10 },

  // Union Territory: Puducherry (PY)
  { name: 'Puducherry', slug: 'puducherry', state: 'Puducherry', state_code: 'PY', sort_order: 3 },
  { name: 'Karaikal', slug: 'karaikal', state: 'Puducherry', state_code: 'PY', sort_order: 10 }
];

module.exports = {
  INDIA_CITIES
};

