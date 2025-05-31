import { NhostClient } from "@nhost/nhost-js";

const backendUrl = process.env.NHOST_BACKEND_URL;
const nhost = new NhostClient({ backendUrl });

export default async (req, res) => {
  try {
    // Extract imgId from query params
    const imgId = req.query.text;
    console.log("imgId", imgId);

    if (!imgId) {
      return res.status(400).json({ error: "No image token provided" });
    }

    // Define GraphQL queries
    const GET_ID = `
      query GetTrackerId($id: String!) {
        Tracker(where: { img_id: { _eq: $id } }) {
          id
        }
      }
    `;

    const UPDATE_QUERY = `
      mutation UpdateSeenDate($id: Int!, $date: timestamptz!) {
        update_Tracker(
          where: { id: { _eq: $id } }
          _set: { seen_at: $date }
        ) {
          affected_rows
        }
      }
    `;

    // Step 1: Fetch tracker ID
    const { data, error } = await nhost.graphql.request(GET_ID, {
      id: imgId, // Correct variable name
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data?.Tracker?.length) {
      return res.status(404).json({ error: "No matching record found" });
    }

    const trackerId = data.Tracker[0].id;

    // Step 2: Update seen_at timestamp
    const { data: updatedData, error: updateError } =
      await nhost.graphql.request(UPDATE_QUERY, {
        id: trackerId,
        date: new Date().toISOString(), // Ensure ISO format
      });

    if (updateError) {
      return res.status(500).json({ error: updateError.message }); // Fixed variable
    }

    // Success response
    res.status(200).json({ success: true, updatedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
