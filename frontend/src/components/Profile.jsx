import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  ArrowLeft, LogOut, ChevronRight, Camera, Check, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Profile({ session, onSignOut }) {
  const navigate = useNavigate();
  const user = session?.user;
  const fileInputRef = useRef(null);

  // Local state for editing fields
  const [editingField, setEditingField] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || '',
    dob: user?.user_metadata?.dob || 'Not set',
    gender: user?.user_metadata?.gender || 'Not set',
    email: user?.email || '',
    username: user?.user_metadata?.username || user?.email?.split('@')[0] || '',
  });

  const [saving, setSaving] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const handleEdit = (field) => {
    // Email and Password might have specific Supabase flows, but we can allow basic metadata edits
    if (field === 'email' || field === 'password') {
      alert(`Editing ${field} typically requires an email confirmation flow or reset link.`);
      return;
    }
    setEditingField(field);
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const handleSave = async (field) => {
    setSaving(true);
    try {
      if (field === 'name' || field === 'dob' || field === 'gender' || field === 'username') {
        const { error } = await supabase.auth.updateUser({
          data: { 
            display_name: formData.name,
            dob: formData.dob,
            gender: formData.gender,
            username: formData.username
          }
        });
        if (error) throw error;
      }
      setEditingField(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('relation "storage.buckets" does not exist')) {
          alert("The 'avatars' storage bucket does not exist! Please go to your Supabase dashboard > Storage, and create a PUBLIC bucket named 'avatars'.");
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      alert("Profile picture uploaded to Supabase Storage successfully!");
      
    } catch (error) {
      console.error("Upload error detail:", error);
      
      // Check for RLS error specifically
      if (error.message?.includes('row-level security') || error.statusCode === '403') {
        alert("UPLOAD BLOCKED BY SECURITY (RLS):\n\nYour 'avatars' bucket exists, but Supabase blocks uploads by default.\n\nYou must go to Supabase Dashboard -> Storage -> Policies, and click 'New Policy' under the 'avatars' bucket to allow 'INSERT' and 'UPDATE' operations for users.");
      } else {
        alert("Error uploading image: " + error.message);
      }
    } finally {
      setSaving(false);
      // Reset the file input so the same file can be selected again if needed
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const renderRow = (label, fieldKey, value, isPassword = false) => {
    const isEditing = editingField === fieldKey;

    return (
      <div 
        className="flex items-center justify-between py-4 border-b border-border/50 hover:bg-muted/30 transition-colors px-2 rounded-md group cursor-pointer" 
        onClick={() => !isEditing && handleEdit(fieldKey)}
      >
        <div className="w-1/3 text-sm font-medium text-muted-foreground">
          {label}
        </div>
        <div className="w-2/3 flex items-center justify-between">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full pr-4" onClick={e => e.stopPropagation()}>
              
              {fieldKey === 'gender' ? (
                <select 
                  value={formData[fieldKey] === 'Not set' ? '' : formData[fieldKey]}
                  onChange={(e) => setFormData({...formData, [fieldKey]: e.target.value})}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              ) : fieldKey === 'dob' ? (
                <Input 
                  type="date"
                  autoFocus
                  value={formData[fieldKey] === 'Not set' ? '' : formData[fieldKey]} 
                  onChange={(e) => setFormData({...formData, [fieldKey]: e.target.value})}
                  className="h-8"
                />
              ) : (
                <Input 
                  autoFocus
                  value={formData[fieldKey]} 
                  onChange={(e) => setFormData({...formData, [fieldKey]: e.target.value})}
                  className="h-8"
                />
              )}

              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleSave(fieldKey)} disabled={saving}>
                <Check size={16} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleCancel} disabled={saving}>
                <X size={16} />
              </Button>
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold text-foreground truncate pr-4">
                {isPassword ? '••••••••••' : value}
              </div>
              <ChevronRight size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-8">
        <div className="container flex h-16 mx-auto max-w-screen-2xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="text-2xl tracking-tight">Account Settings</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/templates')} className="gap-2 shadow-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl px-4 md:px-8 mx-auto space-y-12">
        
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground/90">Basic info</h2>
          
          <div className="flex flex-col">
            {/* Profile Picture Row */}
            <div className="flex items-center justify-between py-5 border-b border-border/50 px-2">
              <div className="w-1/3 text-sm font-medium text-muted-foreground">
                Profile Picture
              </div>
              <div className="w-2/3 flex items-center gap-6">
                
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />

                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl font-bold overflow-hidden shadow-sm ring-1 ring-border">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(formData.name)
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button 
                    className="text-sm font-medium text-foreground hover:underline text-left" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    {saving ? 'Uploading...' : 'Upload new picture'}
                  </button>
                  <button 
                    className="text-sm font-medium text-red-500 hover:text-red-600 text-left"
                    onClick={async () => {
                      if (!confirm("Remove profile picture?")) return;
                      await supabase.auth.updateUser({ data: { avatar_url: null } });
                      alert("Picture removed!");
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {renderRow('Name', 'name', formData.name)}
            {renderRow('Date of Birth', 'dob', formData.dob)}
            {renderRow('Gender', 'gender', formData.gender)}
            {renderRow('Email', 'email', formData.email)}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground/90">Account info</h2>
          
          <div className="flex flex-col">
            {renderRow('Username', 'username', formData.username)}
            {renderRow('Password', 'password', '********', true)}
          </div>
        </div>

      </main>
    </div>
  );
}
