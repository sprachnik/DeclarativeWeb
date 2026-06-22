// ============================================
// Image Upload Functions
// ============================================

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    alert('Image is too large. Please choose an image under 10MB.')
    return
  }

  try {
    addChatMessage('system', 'Uploading photo...')

    const resizedBase64 = await compressAndResizeImage(file, 400)
    currentImageBase64 = resizedBase64

    const imageUrl = await uploadImageToStorage(resizedBase64, file.name)
    currentImageUrl = imageUrl

    const previewContainer = document.getElementById('image-preview-container')
    const previewImg = document.getElementById('image-preview')
    previewImg.src = resizedBase64
    previewContainer.style.display = 'block'

    if (window.lucide) lucide.createIcons()

    updateGenerateButtonState()

    addChatMessage('system', 'Photo uploaded! You can generate a vibe with just the image or add a description.')
  } catch (error) {
    alert('Error processing image: ' + error.message)
    console.error(error)
  }

  event.target.value = ''
}

async function uploadImageToStorage(base64Data, fileName) {
  const base64Response = await fetch(base64Data)
  const blob = await base64Response.blob()

  const timestamp = Date.now()
  const uniqueFileName = `vibe-${currentUser.id}-${timestamp}.jpg`

  const { data, error } = await supabaseClient.storage
    .from('vibe-images')
    .upload(uniqueFileName, blob, {
      contentType: 'image/jpeg',
      upsert: false
    })

  if (error) throw error

  const { data: urlData } = supabaseClient.storage
    .from('vibe-images')
    .getPublicUrl(uniqueFileName)

  return urlData.publicUrl
}

function clearImage() {
  currentImageBase64 = null
  currentImageUrl = null
  const previewContainer = document.getElementById('image-preview-container')
  previewContainer.style.display = 'none'
  document.getElementById('image-input').value = ''
  updateGenerateButtonState()
}

function updateGenerateButtonState() {
  const generateBtn = document.getElementById('generate-btn')
  const input = document.getElementById('chat-input')
  const hasText = input && input.value.trim().length > 0
  const hasImage = currentImageBase64 !== null

  generateBtn.disabled = !hasText && !hasImage
}

async function compressAndResizeImage(file, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        resolve(resizedBase64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
