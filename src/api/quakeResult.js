// src/api/quakeResult.js
import axios from 'axios';

const BASE_URL = 'http://10.110.7.101:8080';

export const getQuakeResult = () => {
  return axios.get(`${BASE_URL}/homepage/quakeresult/total`)
    .then(response => response.data)
    .catch(error => {
      console.error('Error fetching quake result:', error);
      throw error;
    });
};
