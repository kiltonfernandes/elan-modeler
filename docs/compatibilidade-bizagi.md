# Pesquisa de compatibilidade com Bizagi Modeler

Pesquisa realizada em 26–27 de outubro de 2026. Prioridade: documentação oficial do Bizagi, especificação da OMG e documentação Microsoft. As páginas do Modeler e do Studio foram distinguidas; versões citadas em páginas diferentes não foram tratadas como equivalentes.

## O que são os ícones da captura

São **formatos de arquivo e operações de intercâmbio**, não protocolos de transporte. BPMN descreve modelos de processos; XPDL é outro formato de intercâmbio; Visio identifica uma família de formatos de desenho; `.bpm` é o arquivo do modelo Bizagi. Atributos possuem um fluxo XML próprio. A lista oficial também inclui Blueworks como origem de importação. [Bizagi: Exchanging processes](https://help.bizagi.com/platform/en/exchanging_processes.htm)

## Inventário verificado

| Família      | Bizagi documentado                                                                                                      | Consequência para o Élan                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| BPMN         | Importação e exportação em BPMN 2.0 XML.                                                                                | Priorizar o XML semântico e o BPMN DI como intercâmbio principal.                               |
| XPDL         | Importação; exportação citada como 2.2 no guia de documentação. Outras páginas citam 2.1.                               | Aceitar a leitura básica de 2.1/2.2 e identificar a saída como subconjunto experimental de 2.2. |
| Visio        | Guia do Modeler cita Visio 2010, 2013 e 2016; requer Visio instalado para exportar no Bizagi.                           | Não apresentar uma conversão própria de XML como equivalente à integração nativa com o Visio.   |
| Bizagi       | `.bpm` aparece como modelo local e formato para troca com outro Modeler.                                                | Não renomear BPMN/JSON para `.bpm`; não declarar suporte sem um leitor e escritor testados.     |
| Blueworks    | Importação de XML XPDL 2.1.                                                                                             | Usar o adaptador XPDL, com revisão de layout e semântica.                                       |
| Atributos    | Exportação/importação independente entre modelos.                                                                       | Preservar o esquema e as extensões; o esquema Élan não é o XML Bizagi.                          |
| Imagens      | PNG, SVG e JPG aparecem nas opções de exportação; a documentação contém a grafia ambígua “bpm” em uma lista de imagens. | Oferecer os formatos efetivamente implementados; não inferir um formato adicional dessa grafia. |
| Documentação | Word, PDF, Excel, Web, SharePoint e MediaWiki variam conforme produto/opção.                                            | Distinguir arquivo gerado de publicação em serviço remoto.                                      |

Fontes por família: [BPMN import](https://help.bizagi.com/platform/en/import_diagram_from_bpmn.htm), [BPMN export](https://help.bizagi.com/platform/en/exporting_to_bpmn.htm), [XPDL import](https://help.bizagi.com/platform/en/import_from_xpdl.htm), [XPDL export](https://help.bizagi.com/platform/en/xpdl_for_attributes.htm), [documentação e exportações](https://help.bizagi.com/platform/en/generating_documentation.htm), [Visio export](https://help.bizagi.com/platform/en/visio_documentation.htm).

## BPMN: semântica e desenho

O XML semântico representa processos, atividades, eventos, conexões e referências. O BPMN DI representa o desenho, incluindo formas, coordenadas, dimensões e caminhos. Conseguir ler um processo não implica recuperar seu layout. A OMG publica o documento normativo e os esquemas BPMN20, Semantic, BPMNDI, DC e DI. [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/)

O Bizagi adverte que algumas origens, como Blueworks, podem exportar BPMN sem coordenadas e recomenda XPDL nesse caso. O Élan pode aplicar layout automático quando o arquivo não possui diagramas DI, mas essa operação não recupera o desenho original e possui limites para colaborações e artefatos. [Bizagi: BPMN import](https://help.bizagi.com/platform/en/import_diagram_from_bpmn.htm), [bpmn-auto-layout: limitações](https://github.com/bpmn-io/bpmn-auto-layout)

No Élan, importação/exportação BPMN usa o motor correspondente à família do diagrama. Isso preserva os dados representados no metamodelo, inclusive propriedades que não possuem um formulário dedicado. O editor XML permite inspecioná-las. Preservação em um teste não comprova conformidade normativa de todas as combinações possíveis.

## Tarefas e subprocessos

UserTask, ServiceTask, SendTask, ReceiveTask, ScriptTask, ManualTask e BusinessRuleTask são tipos BPMN, com diferenças semânticas. SubProcess contém um fluxo; CallActivity referencia um elemento reutilizável; Transaction e AdHocSubProcess possuem semânticas próprias. É possível representar isso em BPMN XML sem depender do arquivo `.bpm`. Desenhar uma SendTask não configura nem executa um servidor de e-mail. [OMG: especificação normativa](https://www.omg.org/spec/BPMN/2.0.2/PDF)

O tutorial é útil para identificar ações da interface, mas usa algumas explicações informais. Um gateway paralelo divide/junta caminhos obrigatórios; um gateway baseado em eventos espera eventos concorrentes e não deve ser usado apenas como sinônimo de paralelismo. O Élan mantém variantes separadas e propriedades explícitas.

## XPDL: versões e perdas

A página de geração de documentação do Modeler diz **XPDL 2.2**. A página de portabilidade de Modeler/Studio cita **XPDL 2.1**. O tutorial de importação de Blueworks também especifica XML XPDL 2.1. As evidências não permitem afirmar que toda instalação exporta a mesma versão. É necessário conferir o namespace, o cabeçalho e um arquivo real da versão em uso. [Modeler: documentação](https://help.bizagi.com/platform/en/generating_documentation.htm), [portabilidade](https://help.bizagi.com/platform/en/modeler-and-studio-offboarding.htm), [Blueworks](https://help.bizagi.com/platform/en/import_diagram_from_blueworks.htm)

O adaptador Élan mapeia atividades comuns, tipos de tarefas, eventos básicos, gateways, transições, coordenadas, pools/raias e ActivitySets para subprocessos. Não foi certificado contra todo o XSD XPDL nem contra um corpus completo de arquivos Bizagi. Extensões de fornecedor, dados, condições avançadas, mensagens entre participantes, parâmetros de simulação e detalhes de eventos exigem revisão. Coreografias/conversações devem usar BPMN, e os exportadores experimentais recusam esses documentos para evitar uma conversão incompleta.

## Visio: formato não é stencil

VSD é o formato binário antigo; VDX é XML legado; VSDX foi introduzido no Visio 2013 e usa um pacote OPC com partes XML e relacionamentos. Um leitor de VDX não equivale a um leitor de VSDX, e nenhum dos dois lê VSD binário automaticamente. [Microsoft: formato VSDX](https://learn.microsoft.com/en-us/office/client-developer/visio/introduction-to-the-visio-file-formatvsdx)

O Bizagi mapeia formas do stencil para elementos BPMN, permite corrigir formas desconhecidas e documenta mudanças de representação para raias/marcos orientados de forma diferente. Também ignora conectores desconectados. A fidelidade depende de stencil, geometria, escala e conectividade, não apenas da extensão do arquivo. [Bizagi: Visio import](https://help.bizagi.com/platform/en/import_from_visio.htm)

O Élan lê um subconjunto de páginas VDX/VSDX, usa nomes de formas/masters e tenta recuperar conectores. Não resolve integralmente grupos aninhados, transformações, herança dos masters e todos os stencils. Sua saída VDX contém formas e conectores genéricos; não é uma reprodução do stencil BPMN do Bizagi. A instalação de Visio não é exigida para esses adaptadores próprios. O guia oficial do Bizagi exige Visio em sua integração. [Bizagi: Visio export](https://help.bizagi.com/platform/en/visio_documentation.htm)

## Atributos: documentação oficial divergente

A tabela geral de intercâmbio marca atributos estendidos em BPMN. A página específica de exportação BPMN afirma que esses atributos não são incluídos. A página de XPDL condiciona a inclusão da estrutura de atributos à existência/exportação de dados; a tabela geral não marca atributos em XPDL. Essas diferenças foram registradas, sem escolher uma delas como garantia universal. [Tabela de intercâmbio](https://help.bizagi.com/platform/en/exchanging_processes.htm), [BPMN export](https://help.bizagi.com/platform/en/exporting_to_bpmn.htm), [XPDL export](https://help.bizagi.com/platform/en/xpdl_for_attributes.htm)

Para migração, exporte separadamente os atributos pelo recurso próprio do Bizagi e compare nome, tipo, cardinalidade e valor. O Élan possui namespace `https://elan-modeler.app/schema/1.0` para seus atributos e um XML próprio. Esse URI identifica um esquema; não pressupõe um serviço hospedado. Nenhum mapeamento do esquema Bizagi foi declarado sem amostras e validação. [Bizagi: troca de atributos](https://portal.bizagi.com/bpm-suite/en/exporting_importing_attributes_between_models.htm)

## Arquivo `.bpm` e conteúdo do modelo

O guia identifica `.bpm` como arquivo local do modelo. Sua tabela distingue diagramas, atributos, arquivos anexados, comentários, revisões e recursos de nuvem. Portanto, converter somente o desenho não migra necessariamente o conteúdo do projeto. A pesquisa não encontrou nas fontes consultadas um contrato público suficiente para implementar e certificar um leitor/escritor completo desse formato. Isso é uma limitação da pesquisa e da implementação, não uma afirmação de impossibilidade técnica. [Bizagi: visão geral](https://help.bizagi.com/platform/en/intro_welcome.htm/1000)

## Simulação e serviços

Bizagi documenta simulação baseada em **BPSim**, com análises de processo, tempo, recursos e calendários. O Élan usa simulação interativa de tokens para explorar caminhos; não implementa a análise quantitativa BPSim nem reivindica compatibilidade com cenários BPSim. [Bizagi: simulação](https://help.bizagi.com/platform/en/simulation.htm), [níveis de análise](https://help.bizagi.com/platform/en/simulation_in_bizagi_st.htm)

Publicação em Word/Excel/Visio e em serviços remotos pode depender de software e configuração adicionais no Bizagi. O Élan gera arquivos próprios e não realiza publicação em SharePoint ou MediaWiki. Recursos de nuvem, comentários compartilhados, permissões e governança demandam infraestrutura que não está nesta versão. [Requisitos oficiais](https://help.bizagi.com/platform/en/bm_requirements.htm)

## Como validar uma migração real

1. Conservar os arquivos de origem sem alteração e registrar a versão do Bizagi.
2. Exportar BPMN e atributos separadamente; guardar também o `.bpm` original.
3. Testar processos com raias, subprocessos, eventos de borda, transações, loops, mensagens e dados.
4. Comparar IDs, nomes, tipos, referências, gatilhos, condições, documentação, extensões e DI.
5. Exportar do Élan, reabrir nele e no aplicativo de destino e comparar novamente.
6. Usar XPDL/Visio somente quando o subconjunto necessário estiver coberto por testes reais.

Os testes atuais usam modelos controlados e integração real no navegador. Ainda é necessário um corpus de arquivos exportados por instalações reais do Bizagi para afirmar fidelidade entre produtos.
