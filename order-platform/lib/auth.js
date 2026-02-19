// lib/auth.js
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';

// Hash password
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password);
}

// Admin login
export async function loginAdmin(email, password) {
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();
  
  if (error || !admin) {
    return { error: 'Invalid credentials' };
  }
  
  const isValid = await comparePassword(password, admin.password_hash);
  
  if (!isValid) {
    return { error: 'Invalid credentials' };
  }
  
  // Update last login
  await supabase
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id);
  
  // Remove password hash from returned data
  const { password_hash, ...adminData } = admin;
  
  return { data: adminData };
}

// Vendor login
export async function loginVendor(email, password) {
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error || !vendor) {
    return { error: 'Invalid credentials' };
  }
  
  if (vendor.status !== 'approved') {
    return { error: 'Your account is not approved yet or has been suspended' };
  }
  
  const isValid = await comparePassword(password, vendor.password_hash);
  
  if (!isValid) {
    return { error: 'Invalid credentials' };
  }
  
  // Remove password hash from returned data
  const { password_hash, ...vendorData } = vendor;
  
  return { data: vendorData };
}

// Vendor registration
export async function registerVendor(vendorData) {
  try {
    const hashedPassword = await bcrypt.hash(vendorData.password, 10);

    const { data, error } = await supabase
      .from('vendors')
      .insert([{
        email: vendorData.email,
        password_hash: hashedPassword,
        company_name: vendorData.company_name,
        tin_number: vendorData.tin_number,
        contact_person: vendorData.contact_person,
        phone_number: vendorData.phone_number,
        address: vendorData.address,
        business_category: vendorData.business_category || 'general',
        welcome_message: vendorData.welcome_message,
        bot_deep_link: vendorData.bot_deep_link,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Registration error:', error);
    return { data: null, error: error.message };
  }
}

// Session management functions
export function setSession(type, data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${type}_session`, JSON.stringify(data));
  }
}

export function getSession(type) {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem(`${type}_session`);
    return session ? JSON.parse(session) : null;
  }
  return null;
}

export function clearSession(type) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${type}_session`);
  }
}

export function isAuthenticated(type) {
  return getSession(type) !== null;
}