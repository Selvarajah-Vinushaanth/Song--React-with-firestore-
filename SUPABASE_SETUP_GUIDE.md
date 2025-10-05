# Supabase Setup for Profile Image Storage

## 🎯 Overview
This guide will help you set up Supabase for storing profile images in your Tamil Song Writing Assistant application.

## 📋 Prerequisites
- Supabase account (free tier available)
- Your React application running

## 🚀 Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Choose a project name: `tamil-song-assistant` (or your preferred name)
5. Set a strong database password
6. Choose a region closest to your users

### 2. Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIs...`)

### 3. Configure Environment Variables
1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your Supabase credentials:

```env
# Add these to your .env.local file
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

⚠️ **Important**: Replace the placeholder values with your actual Supabase credentials.

### 4. Create Storage Bucket
1. In Supabase dashboard, go to **Storage**
2. Click **Create bucket**
3. Bucket name: `profiles`
4. Make it **Public** (so profile images can be accessed)
5. Click **Create bucket**

### 5. Set Storage Policies
In the Storage section, click on your `profiles` bucket, then go to **Policies**:

#### Allow Upload Policy
```sql
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profiles');
```

#### Allow Public Read Policy
```sql
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profiles');
```

#### Allow Users to Update Their Own Images
```sql
CREATE POLICY "Allow users to update own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'profiles');
```

#### Allow Users to Delete Their Own Images
```sql
CREATE POLICY "Allow users to delete own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'profiles');
```

### 6. Install Dependencies
Run this command in your project directory:
```bash
npm install @supabase/supabase-js
```

### 7. Test the Setup
1. Start your React application: `npm start`
2. Go to the Profile page
3. Try uploading a profile image
4. Check your Supabase Storage dashboard to see if the image was uploaded

## 📁 File Structure
After setup, your files should look like this:
```
src/
├── config/
│   └── supabase.js          # Supabase configuration
├── pages/
│   └── Profile.jsx          # Updated with Supabase integration
.env.local                   # Your environment variables
```

## 🔧 Features Implemented

### ✅ Profile Image Upload
- Upload images to Supabase Storage
- Automatic file naming with user ID and timestamp
- File type validation (images only)
- File size validation (5MB limit)

### ✅ Image Optimization
- Automatic image optimization using Supabase transformations
- Resizing to 150x150 for profile display
- Quality optimization for faster loading

### ✅ Old Image Cleanup
- Automatically deletes previous profile image when uploading new one
- Prevents storage bloat
- Maintains only the latest profile image

### ✅ Error Handling
- Comprehensive error messages
- Upload progress indicators
- Fallback to default avatar if upload fails

## 🎨 Usage in Profile Component

The profile component now:
1. **Uploads** images directly to Supabase Storage
2. **Updates** Firebase Auth profile with Supabase image URL
3. **Deletes** old images automatically
4. **Optimizes** images for better performance
5. **Handles** errors gracefully

## 🔒 Security Features

- **Authenticated uploads only**: Only logged-in users can upload
- **File type validation**: Only image files accepted
- **File size limits**: 5MB maximum file size
- **Automatic cleanup**: Old images are deleted to prevent storage abuse

## 🌍 Production Considerations

1. **Image Optimization**: Consider upgrading to Supabase Pro for advanced image transformations
2. **CDN**: Supabase includes CDN by default for fast global image delivery
3. **Backup**: Enable daily backups in Supabase dashboard
4. **Monitoring**: Set up usage alerts for storage limits

## 🐛 Troubleshooting

### Common Issues:

1. **Upload fails**: Check if bucket is public and policies are correctly set
2. **Images don't load**: Verify the bucket URL and public access
3. **Environment variables**: Make sure `.env.local` is in project root and variables start with `REACT_APP_`

### Debug Steps:
1. Check browser console for errors
2. Verify Supabase credentials in dashboard
3. Test bucket access in Supabase Storage interface
4. Ensure policies are active and correctly configured

## 🎉 Success!

Your Tamil Song Writing Assistant now has:
- ✅ Professional profile image storage
- ✅ Automatic image optimization
- ✅ Secure upload handling
- ✅ Clean storage management

Users can now upload beautiful profile pictures that are stored securely in Supabase! 🎵✨