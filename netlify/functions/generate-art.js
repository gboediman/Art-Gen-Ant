exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    // Step 1: Use Gemini to enhance the prompt
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a detailed, artistic description for an abstract art image based on this prompt: "${prompt}". Make it vivid, descriptive, and suitable for image generation. Focus on colors, shapes, textures, and artistic elements. Keep it under 200 words.`
          }]
        }]
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API Error:', errorData);
      return {
        statusCode: geminiResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `Gemini API Error: ${errorData.error?.message || 'Unknown error'}` 
        })
      };
    }

    const geminiData = await geminiResponse.json();
    const enhancedPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || prompt;

    // Step 2: Generate image using free service (Pollinations)
    // This is a free AI image generation service
    const imagePrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1792&seed=${Math.floor(Math.random() * 1000000)}`;

    // Test if the image URL is accessible
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to generate image');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        imageUrl: imageUrl,
        enhancedPrompt: enhancedPrompt
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

