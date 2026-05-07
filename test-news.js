async function test() {
  const res = await fetch('http://localhost:3000/api/news');
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(data);
}
test();
