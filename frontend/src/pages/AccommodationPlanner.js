import React, { useState } from 'react';
import FormattedAIReport from '../components/FormattedAIReport';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export default function AccommodationPlanner() {
  const [result, setResult] = useState(null);

  const plan = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/accommodation-planner/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ learner: { name: 'Avery' }, lesson: { title: 'Fractions with visual models' }, needs: ['attention', 'executive_function', 'anxiety'] }),
    });
    setResult(await res.json());
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>IEP Accommodation Planner</h1>
      <p>Generate classroom-ready supports for learner needs and lesson context.</p>
      <button onClick={plan}>Generate plan</button>
      {result !== null && <FormattedAIReport response={result} title="Accommodation plan" />}
    </div>
  );
}
