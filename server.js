const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (allows your hosting panel to call this API)
app.use(cors());
app.use(express.json());

app.post('/api/submit-survey', async (req, res) => {
  try {
    const data = req.body;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const workbookId = process.env.ZOHO_WORKBOOK_ID;
    const worksheetName = process.env.ZOHO_WORKSHEET_NAME || "Sheet2";
    const dc = process.env.ZOHO_DC || "in";
    const accountsUrl = `https://accounts.zoho.${dc}`;
    const sheetUrl = `https://sheet.zoho.${dc}`;

    if (!clientId || !clientSecret || !refreshToken || !workbookId) {
      console.warn("Zoho credentials missing in environment variables.");
      return res.status(500).json({ error: "Backend configuration incomplete" });
    }

    // 1. Get Access Token using Refresh Token
    const tokenResponse = await fetch(`${accountsUrl}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`, {
      method: "POST",
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("Zoho Token Error:", tokenData);
      return res.status(500).json({ error: `Failed to refresh Zoho access token` });
    }

    const accessToken = tokenData.access_token;

    // 2. Add Row to Zoho Sheet
    const surveyData = {
      "Name": data.name,
      "Overall Experience": data.overall_experience,
      "Trainer Explanation": data.trainer_explanation,
      "Content Usefulness": data.content_usefulness,
      "Session Pace": data.session_pace,
      "Recommend Workshop": data.recommend_workshop,
      "Future Topic": data.future_topic,
      "Timestamp": new Date().toLocaleString(),
    };

    const addRowResponse = await fetch(`${sheetUrl}/api/v2/${workbookId}`, {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        method: "worksheet.records.add",
        worksheet_name: worksheetName,
        json_data: JSON.stringify([surveyData]),
      }),
    });

    const result = await addRowResponse.json();

    if (result.status !== "success") {
      console.error("Zoho Sheet Error:", result);
      return res.status(500).json({ error: result.message || "Failed to add row to Zoho Sheet" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Survey submission error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
