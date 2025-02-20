import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

let connectedClients = [];

wss.on("connection", (ws) => {
  console.log("New client connected");
  connectedClients.push(ws);

  ws.on("close", () => {
    console.log("Client disconnected");
    connectedClients = connectedClients.filter((client) => client !== ws);
  });
});

const checkAndCreateWebhook = async () => {
  const siteId = process.env.SITE_ID;
  const webhookUrl = process.env.WEBHOOK_URL;
  const triggerType = "form_submission";
  const formName = process.env.FORM_NAME;

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
  };

  try {
    const response = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/webhooks`,
      { headers }
    );
    const data = await response.json();

    const existingWebhook = data?.webhooks?.find(
      (webhook) =>
        webhook.triggerType === triggerType &&
        webhook.url === webhookUrl &&
        webhook.filter?.name === formName
    );

    if (existingWebhook) {
      console.log("Webhook already exists:", existingWebhook);
    } else {
      const options = {
        method: "POST",
        headers,
        body: JSON.stringify({
          triggerType: triggerType,
          url: webhookUrl,
          filter: {
            name: formName,
          },
        }),
      };

      const createResponse = await fetch(
        `https://api.webflow.com/v2/sites/${siteId}/webhooks`,
        options
      );
      const createData = await createResponse.json();
      console.log("Webhook created:", createData);
    }
  } catch (error) {
    console.error("Error checking or creating webhook:", error);
  }
};

checkAndCreateWebhook();

const findContactByEmail = async (email) => {
  const url = "https://api.hubapi.com/crm/v3/objects/contacts/search";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["email"],
    }),
  });

  const data = await response.json();
  return data.total > 0 ? data.results[0].id : null;
};

const updateContact = async (contactId, properties) => {
  const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify({ properties }),
  });

  return response.json();
};

const createContact = async (properties) => {
  const url = "https://api.hubapi.com/crm/v3/objects/contacts";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify({ properties }),
  });

  return response.json();
};

const getScoreData = async (formData) => {
  const scoreUrl = "https://api2.usemellow.com/process";
  const optionsScore = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        email: formData.leadEmail,
        name: formData.leadFirstName || "empty name",
        role: formData.leadRole,
        team_size: formData.leadTeamSize,
        country: formData.leadCountry,
      },
    }),
  };

  const responseScore = await fetch(scoreUrl, optionsScore);
  if (!responseScore.ok) {
    throw new Error(`Error: ${responseScore.status}`);
  }

  return responseScore.json();
};

const mapFormDataToHubSpot = (formData, resData) => {
  return {
    email: formData.leadEmail,
    firstname: formData.leadFirstName || "NoName",
    company_size: formData.leadTeamSize,
    custom_source: formData.leadSource || "Website",
    contact_role: formData.leadRole,
    phone: formData.leadPhone || "NoPhone",
    ga_id: formData.gaCookie || "NoGAID",
    country: formData.leadCountry,
    utm_campaign: formData.utm_campaign || "NoCampaign",
    utm_content: formData.utm_content || "NoContent",
    utm_medium: formData.utm_medium || "NoMedium",
    utm_source: formData.utm_source || "NoSource",
    utm_term: formData.utm_term || "NoTerm",
    referral_code: formData.referralCode,
    custom_language: formData.hsLang,
    lead_tags: formData.formName,
    custom_score: resData.score,
    affiliate_code: formData.affiliate_aid,
  };
};

app.post("/", async (req, res) => {
  console.log("Получены данные из вебхука:", JSON.stringify(req.body, null, 2));

  const formData = req.body.payload.data;
  console.log("Данные формы:", JSON.stringify(formData, null, 2));

  try {
    const resData = await getScoreData(formData);
    console.log(
      "Получены данные из score API:",
      JSON.stringify(resData, null, 2)
    );

    const combinedData = mapFormDataToHubSpot(formData, resData);
    console.log(
      "Объединенные данные для HubSpot:",
      JSON.stringify(combinedData, null, 2)
    );

    const existingContactId = await findContactByEmail(formData.leadEmail);

    let hubspotResponse;
    if (existingContactId) {
      console.log(`Контакт найден: ${existingContactId}, обновляем данные...`);
      hubspotResponse = await updateContact(existingContactId, combinedData);
    } else {
      console.log("Контакт не найден, создаем нового...");
      hubspotResponse = await createContact(combinedData);
    }

    console.log("Ответ от HubSpot:", JSON.stringify(hubspotResponse, null, 2));

    setTimeout(() => {
      connectedClients.forEach((client) => {
        client.send(
          JSON.stringify({
            score: resData.score,
            self_service: resData.self_service,
          })
        );
      });
    }, 2000);

    res.send("Запрос обработан, данные обновлены в HubSpot");
  } catch (err) {
    console.error("Ошибка при обработке запроса:", err);
    res.status(500).send("Ошибка сервера");
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
