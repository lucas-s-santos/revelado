/**
 * O slug da página de exemplo, sozinho num módulo só dele.
 *
 * Parece exagero para uma string, e não é. Ele morava em `fixtures.ts`, ao
 * lado do `demoContent` — a página de exemplo inteira, com todos os blocos.
 * Enquanto só Server Components liam a constante, tudo bem. Quando o celular
 * da landing virou um Client Component e passou a importar o slug daqui, o
 * bundler não teve como separar os dois: o `demoContent` foi junto para o
 * cliente e a landing pulou de 203,1 para 224,3 KB gzip — 4 KB acima do teto
 * da SPEC 10, por causa de uma string.
 *
 * Um módulo folha, sem nenhum import, não tem o que arrastar.
 */
export const DEMO_SLUG = "exemplo-marina-e-teo";
