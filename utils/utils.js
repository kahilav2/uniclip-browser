const generateUniqueId = () => {
  return Math.random().toString(36).substr(2, 8) + Math.random().toString(36).substr(2, 8);
}

export default {
  generateUniqueId,
}