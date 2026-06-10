const n = parseInt(process.argv[2]);

if (isNaN(n) || n < 0) {
  console.error('사용법: node test.js <양의 정수>');
  process.exit(1);
}

console.log(Math.floor(Math.random() * (n + 1)));
