const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.SUPERHERO_API_TOKEN;

app.use(express.static('public'));
app.get('/api/hero/:id', async (req, res) => {
  const heroId = req.params.id;

  try {
    const response = await fetch(
      `https://www.superheroapi.com/api.php/${API_TOKEN}/${heroId}`
    );
    const data = await response.json();
    res.json(data);

  } catch (e) {
    res.status(500).json({ error: 'API request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
