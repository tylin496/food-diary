const CLOUD_NAME = 'm3p51nrf'
const UPLOAD_PRESET = 'food-diary'

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`)
  }

  const data = (await res.json()) as { secure_url: string }
  return data.secure_url
}
