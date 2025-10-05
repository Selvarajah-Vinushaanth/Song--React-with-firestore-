import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wtsbiewybmdyzyxniikj.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0c2JpZXd5Ym1keXp5eG5paWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NzU0NjAsImV4cCI6MjA3NTI1MTQ2MH0.PT4u0q-TlVq2PKojtmPFRgSdVXQJy8L1LFoijXicbX0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (url, width = 300, height = 300) => {
  if (!url || !url.includes('supabase')) {
    return url
  }
  
  // Supabase image transformation (if supported by your plan)
  // This requires Supabase Pro plan or higher
  return `${url}?width=${width}&height=${height}&resize=cover&quality=80`
}

// Helper function to upload profile image
export const uploadProfileImage = async (file, userId) => {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `profile-images/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profiles') // This is your storage bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to delete old profile image
export const deleteProfileImage = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('profiles')
      .remove([filePath])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default supabase