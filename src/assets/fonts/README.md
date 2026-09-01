# Fontes empacotadas para a OG image

`opengraph-image.tsx` gera a imagem de compartilhamento com Satori, que exige
os arquivos de fonte em disco (não resolve `next/font`). Só os pesos usados
nessa imagem moram aqui — o resto do site carrega por `next/font/google`.

- **fraunces-600.ttf** — Fraunces, peso 600. SIL Open Font License 1.1.
- **jakarta-500.ttf** — Plus Jakarta Sans, peso 500. SIL Open Font License 1.1.

As duas são OFL, redistribuíveis. Para ficar 100% em conformidade com a OFL,
inclua o `OFL.txt` de cada família aqui — a licença exige que o texto dela
acompanhe os arquivos redistribuídos.
