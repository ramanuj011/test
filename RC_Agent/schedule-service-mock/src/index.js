const express = require('express');
const app = express();
const port = process.env.PORT || 8081;

app.get('/api/schedules', (req, res) => {
  const schedules = [
    { id: '1', title: 'Daily Standup', time: '09:00' },
    { id: '2', title: 'Planning', time: '10:00' },
    { id: '3', title: 'Retro', time: '16:00' }
  ];
  res.json(schedules);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
  console.log(`Schedule mock listening on ${port}`);
});
