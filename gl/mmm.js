for (let i = 0; i < 3; i++) {
  const iCopy = i; // Create a copy of `i`
  setTimeout(() => {
    console.log(iCopy); // Captures the copied value
  }, 1000);
}