# Validação da versão 0.1.0

Verificação local realizada em 27/10/2026, Windows x64. Estes resultados descrevem os casos exercitados; não certificam conformidade integral com BPMN 2.0.2 ou compatibilidade universal com ferramentas externas.

| Verificação                  | Resultado e alcance                                                                                                                                                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários             | 15 aprovados: XML/metamodelo, processos aninhados, atributos, arquivos malformados, XPDL 2.1/2.2, VDX, VSDX, projeto e validação estrutural.                                                                                                                                                              |
| Integração no navegador real | **103 aprovados, 0 falhas**: 89 variantes gráficas, 10 conexões e 4 verificações integradas de propriedades/eventos, conversação, coreografia e troca de motor. Criação, exportação e reimportação XML nos contextos exercitados.                                                                         |
| Schema oficial OMG           | Os quatro exemplos em `examples/` passaram no schema BPMN 2.0.2 com seus imports oficiais, usando lxml. Validade XML não comprova toda a semântica.                                                                                                                                                       |
| Publicação                   | Downloads reais de BPMN, PDF, DOCX e XLSX confirmados pelos botões da interface. PDF renderizado e inspecionado nas duas páginas; DOCX aberto por python-docx com um diagrama e 62 parágrafos; XLSX aberto por openpyxl com 20 linhas e 5 colunas. Sem revisão visual em Microsoft Office nesta execução. |
| Interface                    | PT-BR, seleção/propriedades, edição de tarefa, navegação de subprocesso, criação de coreografia/conversação e menus da paleta conferidos na prévia.                                                                                                                                                       |
| Build                        | TypeScript e Vite concluídos. Empacotamento portátil Windows por Electron Builder. O executável não tem assinatura comercial.                                                                                                                                                                             |

## Reproduzir

```bash
npm ci
npm test
npm run build
npm run dev
```

Abra `/qa.html` e clique em **Run integration checks**. O JSON completo fica disponível na própria página e por download. **Generate publication fixtures** chama os mesmos geradores usados no produto com um diagrama de recrutamento e expõe os arquivos como dados para conferência. A página de QA é ferramenta de desenvolvimento e não entra no build do produto.

Os resultados salvos estão em [browser-integration.json](browser-integration.json), [bpmn-schema-validation.json](bpmn-schema-validation.json) e [publication-validation.json](publication-validation.json). A captura da interface está em [elan-modeler.png](elan-modeler.png).

## Limites dos resultados

- Os adaptadores XPDL/Visio foram exercitados com fixtures controladas; ainda precisam de um corpus de arquivos reais de diferentes versões e fornecedores.
- O schema oficial foi aplicado aos exemplos; o produto não inclui uma validação XSD completa em tempo de edição.
- A criação/reabertura das formas não prova todas as combinações semânticas de exceção, compensação, correlação e instância.
- Coreografias e conversações complexas ainda têm lacunas, descritas na [matriz de cobertura](cobertura-bpmn.md).
- Não foram comprovadas leitura/escrita de `.bpm`, execução de processos nem simulação quantitativa BPSim; essas funções não são anunciadas como implementadas.
