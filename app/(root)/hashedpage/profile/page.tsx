"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PageLoader from '@/components/PageLoader';

export default function UpdateProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
    location: ''
  });

  useEffect(() => {
    if (isLoaded && user) {
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/user/me');
          if (response.ok) {
            const data = await response.json();
            setFormData({
              firstName: data.first_name || user.firstName || '',
              lastName: data.last_name || user.lastName || '',
              username: data.username || user.username || user.emailAddresses?.[0]?.emailAddress?.split('@')[0] || '',
              bio: data.bio || '',
              location: data.location || ''
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [isLoaded, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      toast.success('Profile updated successfully!');
      router.push('/hashedpage');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) return <PageLoader message="Loading your profile..." />;

  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-gray-950"></div>
      
      {/* Subtle accent elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-60"></div>
      <div className="absolute top-20 right-10 w-32 h-32 bg-[#EF3866] rounded-full opacity-5 blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#EF3866] rounded-full opacity-5 blur-2xl"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-[120px]">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold font-sora mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Update Profile
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Keep your personal information up to date and make your profile shine
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-gray-800/50 rounded-3xl p-8 md:p-12 shadow-2xl shadow-black/20 transition-all duration-300 hover:shadow-[#EF3866]/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-300 tracking-wide uppercase">
                  First Name
                </label>
                <div className="relative">
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="bg-black/60 border-gray-700 text-white placeholder-gray-500 h-12 rounded-xl focus:border-[#EF3866] focus:ring-[#EF3866] focus:ring-1 transition-all duration-200 hover:border-gray-600"
                    placeholder="Enter your first name"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-0 transition-opacity duration-200 focus-within:opacity-100"></div>
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-300 tracking-wide uppercase">
                  Last Name
                </label>
                <div className="relative">
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="bg-black/60 border-gray-700 text-white placeholder-gray-500 h-12 rounded-xl focus:border-[#EF3866] focus:ring-[#EF3866] focus:ring-1 transition-all duration-200 hover:border-gray-600"
                    placeholder="Enter your last name"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-0 transition-opacity duration-200 focus-within:opacity-100"></div>
                </div>
              </div>
            </div>

            {/* Username Field */}
            <div className="space-y-3">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-300 tracking-wide uppercase">
                Username
              </label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="bg-black/60 border-gray-700 text-white placeholder-gray-500 h-12 rounded-xl focus:border-[#EF3866] focus:ring-[#EF3866] focus:ring-1 transition-all duration-200 hover:border-gray-600"
                  placeholder="Choose a unique username"
                />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-0 transition-opacity duration-200 focus-within:opacity-100"></div>
              </div>
            </div>

            {/* Bio Field */}
            <div className="space-y-3">
              <label htmlFor="bio" className="block text-sm font-semibold text-gray-300 tracking-wide uppercase">
                Bio
              </label>
              <div className="relative">
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  className="bg-black/60 border-gray-700 text-white placeholder-gray-500 rounded-xl focus:border-[#EF3866] focus:ring-[#EF3866] focus:ring-1 transition-all duration-200 hover:border-gray-600 resize-none"
                  placeholder="Tell us about yourself..."
                />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-0 transition-opacity duration-200 focus-within:opacity-100"></div>
              </div>
            </div>

            {/* Location Field */}
            <div className="space-y-3">
              <label htmlFor="location" className="block text-sm font-semibold text-gray-300 tracking-wide uppercase">
                Location
              </label>
              <div className="relative">
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="bg-black/60 border-gray-700 text-white placeholder-gray-500 h-12 rounded-xl focus:border-[#EF3866] focus:ring-[#EF3866] focus:ring-1 transition-all duration-200 hover:border-gray-600"
                  placeholder="Where are you based?"
                />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-0 transition-opacity duration-200 focus-within:opacity-100"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={submitting}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 bg-transparent h-12 px-8 rounded-xl font-semibold transition-all duration-200 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-gradient-to-r from-[#EF3866] to-[#c42d56] hover:from-[#c42d56] hover:to-[#a8244a] text-white h-12 px-8 rounded-xl font-semibold shadow-lg shadow-[#EF3866]/20 hover:shadow-[#EF3866]/30 transition-all duration-200 transform hover:scale-105 order-1 sm:order-2"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}