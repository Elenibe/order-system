'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Search, X } from 'lucide-react';

export default function VendorProducts() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    description: '',
    unit_price: '',
    brand: '',
    specifications: { size: '', color: '' },
    stock_status: 'in_stock'
  });
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    const session = getSession('vendor');
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    setUserData(session);
    loadProducts(session.id);
  }, [router]);

  // Filter products whenever search query or products change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(product => {
      const matchesCode = product.product_code?.toLowerCase().includes(query);
      const matchesName = product.name?.toLowerCase().includes(query);
      const matchesBrand = product.brand?.toLowerCase().includes(query);
      const matchesSize = product.specifications?.size?.toLowerCase().includes(query);
      const matchesColor = product.specifications?.color?.toLowerCase().includes(query);
      const matchesDescription = product.description?.toLowerCase().includes(query);
      
      return matchesCode || matchesName || matchesBrand || matchesSize || matchesColor || matchesDescription;
    });
    
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const loadProducts = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.id}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setUploading(true);

  try {
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await handleImageUpload(imageFile);
    }

    const productData = {
      vendor_id: userData.id,
      product_code: formData.product_code.toUpperCase(),
      name: formData.name,
      description: formData.description,
      unit_price: parseFloat(formData.unit_price),
      brand: formData.brand || null,
      specifications: formData.specifications,
      stock_status: formData.stock_status,
      images: imageUrl ? [imageUrl] : (editingProduct?.images || []),
      is_active: true
    };

    // Check if stock status changed from out_of_stock to in_stock
    const stockStatusChanged = editingProduct && 
                              editingProduct.stock_status === 'out_of_stock' && 
                              formData.stock_status === 'in_stock';

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) throw error;
      
      // IF STOCK CHANGED TO IN_STOCK, TRIGGER NOTIFICATION
      if (stockStatusChanged) {
        console.log('[v0] Product back in stock, notifying customers...');
        
        // Call the API to notify customers
        try {
          const notifyResponse = await fetch('/api/product-stock-updated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: editingProduct.id,
              productCode: formData.product_code.toUpperCase(),
              productName: formData.name,
              stockStatus: formData.stock_status,
              vendorId: userData.id
            })
          });

          const notifyResult = await notifyResponse.json();
          console.log('[v0] Notification response:', notifyResult);
          
          if (notifyResult.notified && notifyResult.notified > 0) {
            alert(`✅ Product updated! Notified ${notifyResult.notified} customers that this product is back in stock.`);
          } else {
            alert('✅ Product updated! No customers on waitlist.');
          }
        } catch (notifyError) {
          console.error('[v0] Error notifying customers:', notifyError);
          alert('⚠️ Product updated, but failed to notify customers. Please try the /notify_waitlist command in the bot.');
        }
      } else {
        alert('Product updated!');
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;
      alert('Product added!');
    }

    setShowAddModal(false);
    setEditingProduct(null);
    resetForm();
    loadProducts(userData.id);
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Error: ' + error.message);
  } finally {
    setUploading(false);
  }
};

const handleDelete = async (productId) => {
    if (!confirm('Delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      loadProducts(userData.id);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: '',
      name: '',
      description: '',
      unit_price: '',
      brand: '',
      specifications: { size: '', color: '' },
      stock_status: 'in_stock'
    });
    setImageFile(null);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      product_code: product.product_code || '',
      name: product.name,
      description: product.description || '',
      unit_price: product.unit_price.toString(),
      brand: product.brand || '',
      specifications: product.specifications || { size: '', color: '' },
      stock_status: product.stock_status || 'in_stock'
    });
    setShowAddModal(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products Catalog</h1>
            <p className="text-gray-600 mt-1">Manage your products for quick ordering</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowAddModal(true);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>

        {/* Search Bar */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name, code, brand, size, color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-4">Add products so customers can order by code</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Add Your First Product
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">Try a different search term</p>
            <button
              onClick={clearSearch}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-36 bg-gray-200 flex items-center justify-center">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">
                      {product.product_code}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      product.stock_status === 'in_stock' ? 'bg-green-100 text-green-800' :
                      product.stock_status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {product.stock_status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  {product.brand && (
                    <p className="text-xs text-gray-500 mb-2">{product.brand}</p>
                  )}
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  <div className="mb-2">
                    <span className="text-lg font-bold text-purple-600">{product.unit_price} Birr</span>
                  </div>
                  {product.specifications && (product.specifications.size || product.specifications.color) && (
                    <div className="text-xs text-gray-500 mb-2">
                      {product.specifications.size && `${product.specifications.size}`}
                      {product.specifications.size && product.specifications.color && ' • '}
                      {product.specifications.color && `${product.specifications.color}`}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 bg-blue-50 text-blue-600 px-2 py-1.5 rounded text-xs hover:bg-blue-100 flex items-center justify-center"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 bg-red-50 text-red-600 px-2 py-1.5 rounded text-xs hover:bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Code * (e.g., SH8)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_code}
                    onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="SH8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (Birr) *</label>
                  <input
                    type="number"
                    required
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nike Air Max"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                  <select
                    value={formData.stock_status}
                    onChange={(e) => setFormData({...formData, stock_status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <input
                    type="text"
                    value={formData.specifications.size}
                    onChange={(e) => setFormData({
                      ...formData,
                      specifications: {...formData.specifications, size: e.target.value}
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="42, Large, XL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.specifications.color}
                    onChange={(e) => setFormData({
                      ...formData,
                      specifications: {...formData.specifications, color: e.target.value}
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Black, Red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}