// Dados de demonstração (gerados a partir de trabalink-frontend/js/data.js). Senha de todas as contas: demo1234
export const SEED = {
 "usuario": [
  {
   "id": "U01",
   "nome": "Carla Mendes",
   "email": "carla@trabalink.dev",
   "senha": "demo1234",
   "papel": "contratante",
   "telefone": "(11) 98888-1001",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U02",
   "nome": "João Ribeiro",
   "email": "joao@trabalink.dev",
   "senha": "demo1234",
   "papel": "profissional",
   "telefone": "(11) 97777-2002",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U03",
   "nome": "Mariana Silva",
   "email": "mariana@trabalink.dev",
   "senha": "demo1234",
   "papel": "profissional",
   "telefone": "(11) 96666-3003",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U04",
   "nome": "Ana Costa",
   "email": "ana@trabalink.dev",
   "senha": "demo1234",
   "papel": "profissional",
   "telefone": "(11) 95555-4004",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U05",
   "nome": "Rafael Souza",
   "email": "rafael@trabalink.dev",
   "senha": "demo1234",
   "papel": "profissional",
   "telefone": "(11) 94444-5005",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U06",
   "nome": "Bruno Lima",
   "email": "bruno@trabalink.dev",
   "senha": "demo1234",
   "papel": "contratante",
   "telefone": "(11) 93333-6006",
   "foto": "",
   "status": "ativo"
  },
  {
   "id": "U07",
   "nome": "Diego Alves",
   "email": "diego@trabalink.dev",
   "senha": "demo1234",
   "papel": "profissional",
   "telefone": "(11) 92222-7007",
   "foto": "",
   "status": "ativo"
  }
 ],
 "perfil_profissional": [
  {
   "id": "P01",
   "usuario_id": "U02",
   "titulo": "Eletricista residencial e comercial",
   "categoria_id": "eletrica",
   "biografia": "Atendimento para instalações, manutenção preventiva e correções elétricas. Orçamento transparente e registro das etapas do serviço.",
   "localizacao": "Santo André - SP",
   "area_atendimento": "25km",
   "disponibilidade": "seg_sab",
   "faixa_preco": 120,
   "media_avaliacao": 0,
   "cep": ""
  },
  {
   "id": "P02",
   "usuario_id": "U03",
   "titulo": "Designer de interiores",
   "categoria_id": "design_interiores",
   "biografia": "Projetos de ambientes residenciais com foco em funcionalidade, iluminação e orçamento enxuto.",
   "localizacao": "São Paulo - SP",
   "area_atendimento": "remoto",
   "disponibilidade": "seg_sex",
   "faixa_preco": 180,
   "media_avaliacao": 0,
   "cep": ""
  },
  {
   "id": "P03",
   "usuario_id": "U04",
   "titulo": "Fotógrafa de eventos",
   "categoria_id": "fotografia",
   "biografia": "Cobertura de aniversários, eventos corporativos e ensaios, com entrega das fotos tratadas em até 7 dias.",
   "localizacao": "São Bernardo - SP",
   "area_atendimento": "50km",
   "disponibilidade": "fins_semana",
   "faixa_preco": 350,
   "media_avaliacao": 0,
   "cep": ""
  },
  {
   "id": "P04",
   "usuario_id": "U05",
   "titulo": "Pintor residencial",
   "categoria_id": "pintura",
   "biografia": "Pintura interna e externa, texturas e acabamentos. Proteção completa dos móveis e limpeza ao final.",
   "localizacao": "Mauá - SP",
   "area_atendimento": "25km",
   "disponibilidade": "seg_sab",
   "faixa_preco": 400,
   "media_avaliacao": 0,
   "cep": ""
  },
  {
   "id": "P05",
   "usuario_id": "U07",
   "titulo": "Eletricista e instalador",
   "categoria_id": "eletrica",
   "biografia": "Instalação de chuveiros, luminárias e ventiladores de teto.",
   "localizacao": "São Caetano - SP",
   "area_atendimento": "10km",
   "disponibilidade": "todos_dias",
   "faixa_preco": 90,
   "media_avaliacao": 0,
   "cep": ""
  }
 ],
 "habilidade": [
  {
   "id": "H01",
   "nome": "Instalações",
   "descricao": "Instalações elétricas"
  },
  {
   "id": "H02",
   "nome": "Manutenção",
   "descricao": "Manutenção preventiva e corretiva"
  },
  {
   "id": "H03",
   "nome": "Reparos",
   "descricao": "Reparos em geral"
  },
  {
   "id": "H04",
   "nome": "Projeto 3D",
   "descricao": "Modelagem e renderização de ambientes"
  },
  {
   "id": "H05",
   "nome": "Iluminação",
   "descricao": "Projeto e instalação de iluminação"
  },
  {
   "id": "H06",
   "nome": "Fotografia de eventos",
   "descricao": "Cobertura fotográfica"
  },
  {
   "id": "H07",
   "nome": "Edição de imagens",
   "descricao": "Tratamento de fotos"
  },
  {
   "id": "H08",
   "nome": "Pintura residencial",
   "descricao": "Pintura de interiores e fachadas"
  },
  {
   "id": "H09",
   "nome": "Texturas",
   "descricao": "Aplicação de texturas e efeitos"
  }
 ],
 "profissional_habilidade": [
  {
   "id": "PH01",
   "perfil_profissional_id": "P01",
   "habilidade_id": "H01",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH02",
   "perfil_profissional_id": "P01",
   "habilidade_id": "H02",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH03",
   "perfil_profissional_id": "P01",
   "habilidade_id": "H03",
   "nivel_experiencia": "intermediario"
  },
  {
   "id": "PH04",
   "perfil_profissional_id": "P02",
   "habilidade_id": "H04",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH05",
   "perfil_profissional_id": "P02",
   "habilidade_id": "H05",
   "nivel_experiencia": "intermediario"
  },
  {
   "id": "PH06",
   "perfil_profissional_id": "P03",
   "habilidade_id": "H06",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH07",
   "perfil_profissional_id": "P03",
   "habilidade_id": "H07",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH08",
   "perfil_profissional_id": "P04",
   "habilidade_id": "H08",
   "nivel_experiencia": "avancado"
  },
  {
   "id": "PH09",
   "perfil_profissional_id": "P04",
   "habilidade_id": "H09",
   "nivel_experiencia": "intermediario"
  },
  {
   "id": "PH10",
   "perfil_profissional_id": "P05",
   "habilidade_id": "H01",
   "nivel_experiencia": "intermediario"
  },
  {
   "id": "PH11",
   "perfil_profissional_id": "P05",
   "habilidade_id": "H05",
   "nivel_experiencia": "intermediario"
  }
 ],
 "portfolio": [
  {
   "id": "PF01",
   "perfil_profissional_id": "P01",
   "titulo": "Quadro elétrico",
   "descricao": "Reorganização completa de quadro residencial.",
   "arquivo": "",
   "ordem": 1
  },
  {
   "id": "PF02",
   "perfil_profissional_id": "P01",
   "titulo": "Instalação concluída",
   "descricao": "Pontos de tomada em cozinha planejada.",
   "arquivo": "",
   "ordem": 2
  },
  {
   "id": "PF03",
   "perfil_profissional_id": "P01",
   "titulo": "Iluminação",
   "descricao": "Spots embutidos em sala de estar.",
   "arquivo": "",
   "ordem": 3
  },
  {
   "id": "PF04",
   "perfil_profissional_id": "P02",
   "titulo": "Sala integrada",
   "descricao": "Projeto de sala e cozinha integradas.",
   "arquivo": "",
   "ordem": 1
  },
  {
   "id": "PF05",
   "perfil_profissional_id": "P03",
   "titulo": "Casamento no campo",
   "descricao": "Cobertura completa de cerimônia.",
   "arquivo": "",
   "ordem": 1
  },
  {
   "id": "PF06",
   "perfil_profissional_id": "P04",
   "titulo": "Fachada residencial",
   "descricao": "Pintura externa com textura.",
   "arquivo": "",
   "ordem": 1
  }
 ],
 "servico": [
  {
   "id": "S01",
   "perfil_profissional_id": "P01",
   "categoria_id": "eletrica",
   "titulo": "Instalação de tomadas",
   "descricao": "Instalação e troca de tomadas e interruptores.",
   "preco_inicial": 120,
   "localizacao": "Santo André - SP",
   "ativo": true
  },
  {
   "id": "S02",
   "perfil_profissional_id": "P01",
   "categoria_id": "eletrica",
   "titulo": "Revisão do quadro elétrico",
   "descricao": "Diagnóstico e reorganização do quadro.",
   "preco_inicial": 250,
   "localizacao": "Santo André - SP",
   "ativo": true
  },
  {
   "id": "S03",
   "perfil_profissional_id": "P02",
   "categoria_id": "design_interiores",
   "titulo": "Projeto de ambiente",
   "descricao": "Planta, moodboard e lista de compras.",
   "preco_inicial": 180,
   "localizacao": "São Paulo - SP",
   "ativo": true
  },
  {
   "id": "S04",
   "perfil_profissional_id": "P03",
   "categoria_id": "fotografia",
   "titulo": "Cobertura de evento (4h)",
   "descricao": "Até 4 horas de cobertura com 150 fotos tratadas.",
   "preco_inicial": 350,
   "localizacao": "São Bernardo - SP",
   "ativo": true
  },
  {
   "id": "S05",
   "perfil_profissional_id": "P04",
   "categoria_id": "pintura",
   "titulo": "Pintura de cômodo",
   "descricao": "Pintura de até 15 m² com massa corrida.",
   "preco_inicial": 400,
   "localizacao": "Mauá - SP",
   "ativo": true
  },
  {
   "id": "S06",
   "perfil_profissional_id": "P05",
   "categoria_id": "eletrica",
   "titulo": "Instalação de chuveiro",
   "descricao": "Instalação com troca de resistência.",
   "preco_inicial": 90,
   "localizacao": "São Caetano - SP",
   "ativo": true
  },
  {
   "id": "S07",
   "perfil_profissional_id": "P01",
   "categoria_id": "manutencao",
   "titulo": "Pequenos reparos",
   "descricao": "Reparos rápidos em geral.",
   "preco_inicial": 80,
   "localizacao": "Santo André - SP",
   "ativo": false
  }
 ],
 "demanda": [
  {
   "id": "D01",
   "contratante_id": "U01",
   "categoria_id": "eletrica",
   "titulo": "Iluminação da sala",
   "descricao": "Preciso instalar seis pontos de iluminação e revisar dois interruptores. O imóvel está ocupado e o serviço deve ser realizado no sábado.",
   "orcamento": 900,
   "localizacao": "Santo André - SP",
   "prazo": "2026-09-28",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-09-15T13:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D02",
   "contratante_id": "U01",
   "categoria_id": "eletrica",
   "titulo": "Instalação de chuveiro",
   "descricao": "Trocar o chuveiro do banheiro social por um modelo de 7500 W já comprado.",
   "orcamento": 260,
   "localizacao": "Santo André - SP",
   "prazo": "2026-09-30",
   "status": "aberta",
   "anexos": [],
   "criado_em": "2026-09-21T12:30:00.000Z",
   "cep": ""
  },
  {
   "id": "D03",
   "contratante_id": "U06",
   "categoria_id": "eletrica",
   "titulo": "Revisão do quadro elétrico",
   "descricao": "Disjuntores desarmando com frequência. Preciso de diagnóstico e troca se necessário.",
   "orcamento": 450,
   "localizacao": "São Bernardo - SP",
   "prazo": "2026-10-02",
   "status": "aberta",
   "anexos": [],
   "criado_em": "2026-09-22T17:10:00.000Z",
   "cep": ""
  },
  {
   "id": "D04",
   "contratante_id": "U06",
   "categoria_id": "manutencao",
   "titulo": "Troca de tomadas",
   "descricao": "Trocar oito tomadas antigas para o padrão novo.",
   "orcamento": 220,
   "localizacao": "Mauá - SP",
   "prazo": "",
   "status": "aberta",
   "anexos": [],
   "criado_em": "2026-09-22T19:45:00.000Z",
   "cep": ""
  },
  {
   "id": "D05",
   "contratante_id": "U01",
   "categoria_id": "pintura",
   "titulo": "Pintura do quarto",
   "descricao": "Quarto de 12 m², cor branco gelo, com correção de pequenas trincas.",
   "orcamento": 450,
   "localizacao": "Santo André - SP",
   "prazo": "2026-10-05",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-09-18T14:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D06",
   "contratante_id": "U01",
   "categoria_id": "fotografia",
   "titulo": "Fotografia do evento",
   "descricao": "Aniversário de 40 anos, cerca de 60 convidados, 4 horas.",
   "orcamento": 400,
   "localizacao": "São Bernardo - SP",
   "prazo": "2026-09-06",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-08-28T11:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D07",
   "contratante_id": "U01",
   "categoria_id": "eletrica",
   "titulo": "Instalação de ventilador",
   "descricao": "Instalar ventilador de teto no quarto, com ponto já existente.",
   "orcamento": 200,
   "localizacao": "Santo André - SP",
   "prazo": "2026-10-01",
   "status": "aberta",
   "anexos": [],
   "criado_em": "2026-09-20T22:20:00.000Z",
   "cep": ""
  },
  {
   "id": "D08",
   "contratante_id": "U06",
   "categoria_id": "eletrica",
   "titulo": "Reparo em tomadas",
   "descricao": "Duas tomadas da cozinha sem energia.",
   "orcamento": 180,
   "localizacao": "São Bernardo - SP",
   "prazo": "2026-09-29",
   "status": "aberta",
   "anexos": [],
   "criado_em": "2026-09-21T16:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D09",
   "contratante_id": "U06",
   "categoria_id": "eletrica",
   "titulo": "Tomadas da cozinha",
   "descricao": "Instalar quatro novas tomadas na bancada.",
   "orcamento": 300,
   "localizacao": "São Bernardo - SP",
   "prazo": "2026-08-30",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-08-20T13:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D10",
   "contratante_id": "U01",
   "categoria_id": "design_interiores",
   "titulo": "Projeto da sala",
   "descricao": "Projeto para sala de 20 m² com home office.",
   "orcamento": 600,
   "localizacao": "Santo André - SP",
   "prazo": "2026-08-25",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-08-10T13:00:00.000Z",
   "cep": ""
  },
  {
   "id": "D11",
   "contratante_id": "U06",
   "categoria_id": "pintura",
   "titulo": "Pintura da fachada",
   "descricao": "Fachada de sobrado, 40 m².",
   "orcamento": 1500,
   "localizacao": "Mauá - SP",
   "prazo": "2026-08-28",
   "status": "contratada",
   "anexos": [],
   "criado_em": "2026-08-05T13:00:00.000Z",
   "cep": ""
  }
 ],
 "proposta": [
  {
   "id": "R01",
   "demanda_id": "D01",
   "perfil_profissional_id": "P01",
   "valor": 750,
   "prazo": 1,
   "mensagem": "Faço a instalação no sábado pela manhã, material incluso.",
   "status": "aceita",
   "criado_em": "2026-09-15T18:00:00.000Z"
  },
  {
   "id": "R02",
   "demanda_id": "D01",
   "perfil_profissional_id": "P05",
   "valor": 820,
   "prazo": 2,
   "mensagem": "Posso atender no sábado e no domingo.",
   "status": "recusada",
   "criado_em": "2026-09-15T21:00:00.000Z"
  },
  {
   "id": "R03",
   "demanda_id": "D07",
   "perfil_profissional_id": "P01",
   "valor": 180,
   "prazo": 1,
   "mensagem": "Instalação com fixação reforçada.",
   "status": "visualizada",
   "criado_em": "2026-09-21T11:00:00.000Z"
  },
  {
   "id": "R04",
   "demanda_id": "D08",
   "perfil_profissional_id": "P01",
   "valor": 150,
   "prazo": 1,
   "mensagem": "Verifico o circuito e troco as tomadas se necessário.",
   "status": "enviada",
   "criado_em": "2026-09-21T19:00:00.000Z"
  },
  {
   "id": "R05",
   "demanda_id": "D05",
   "perfil_profissional_id": "P04",
   "valor": 400,
   "prazo": 2,
   "mensagem": "Tinta de primeira linha e proteção dos móveis.",
   "status": "aceita",
   "criado_em": "2026-09-18T18:00:00.000Z"
  },
  {
   "id": "R06",
   "demanda_id": "D06",
   "perfil_profissional_id": "P03",
   "valor": 350,
   "prazo": 7,
   "mensagem": "Entrega das fotos tratadas em 7 dias.",
   "status": "aceita",
   "criado_em": "2026-08-28T15:00:00.000Z"
  },
  {
   "id": "R07",
   "demanda_id": "D02",
   "perfil_profissional_id": "P05",
   "valor": 240,
   "prazo": 1,
   "mensagem": "Instalo no mesmo dia, com teste da fiação.",
   "status": "enviada",
   "criado_em": "2026-09-22T13:00:00.000Z"
  },
  {
   "id": "R08",
   "demanda_id": "D09",
   "perfil_profissional_id": "P01",
   "valor": 280,
   "prazo": 1,
   "mensagem": "Instalação com canaleta embutida.",
   "status": "aceita",
   "criado_em": "2026-08-20T17:00:00.000Z"
  },
  {
   "id": "R09",
   "demanda_id": "D10",
   "perfil_profissional_id": "P02",
   "valor": 580,
   "prazo": 10,
   "mensagem": "Projeto com duas revisões inclusas.",
   "status": "aceita",
   "criado_em": "2026-08-10T17:00:00.000Z"
  },
  {
   "id": "R10",
   "demanda_id": "D11",
   "perfil_profissional_id": "P04",
   "valor": 1400,
   "prazo": 4,
   "mensagem": "Textura acrílica e pintura final.",
   "status": "aceita",
   "criado_em": "2026-08-05T17:00:00.000Z"
  }
 ],
 "contratacao": [
  {
   "id": "C01",
   "proposta_id": "R01",
   "contratante_id": "U01",
   "perfil_profissional_id": "P01",
   "valor_combinado": 750,
   "status": "em_andamento",
   "data_inicio": "2026-09-20",
   "data_conclusao": "",
   "historico": [
    {
     "status": "aguardando_inicio",
     "autor_id": "U01",
     "data": "2026-09-16T12:00:00.000Z"
    },
    {
     "status": "em_andamento",
     "autor_id": "U02",
     "data": "2026-09-20T12:05:00.000Z"
    }
   ]
  },
  {
   "id": "C02",
   "proposta_id": "R05",
   "contratante_id": "U01",
   "perfil_profissional_id": "P04",
   "valor_combinado": 400,
   "status": "aguardando_inicio",
   "data_inicio": "",
   "data_conclusao": "",
   "historico": [
    {
     "status": "aguardando_inicio",
     "autor_id": "U01",
     "data": "2026-09-19T13:00:00.000Z"
    }
   ]
  },
  {
   "id": "C03",
   "proposta_id": "R06",
   "contratante_id": "U01",
   "perfil_profissional_id": "P03",
   "valor_combinado": 350,
   "status": "concluida",
   "data_inicio": "2026-09-06",
   "data_conclusao": "2026-09-10",
   "historico": [
    {
     "status": "aguardando_inicio",
     "autor_id": "U01",
     "data": "2026-08-29T13:00:00.000Z"
    },
    {
     "status": "em_andamento",
     "autor_id": "U04",
     "data": "2026-09-06T17:00:00.000Z"
    },
    {
     "status": "entregue",
     "autor_id": "U04",
     "data": "2026-09-10T14:00:00.000Z"
    },
    {
     "status": "concluida",
     "autor_id": "U01",
     "data": "2026-09-10T23:00:00.000Z"
    }
   ]
  },
  {
   "id": "C04",
   "proposta_id": "R08",
   "contratante_id": "U06",
   "perfil_profissional_id": "P01",
   "valor_combinado": 280,
   "status": "concluida",
   "data_inicio": "2026-08-28",
   "data_conclusao": "2026-08-28",
   "historico": [
    {
     "status": "aguardando_inicio",
     "autor_id": "U06",
     "data": "2026-08-21T13:00:00.000Z"
    },
    {
     "status": "em_andamento",
     "autor_id": "U02",
     "data": "2026-08-28T11:00:00.000Z"
    },
    {
     "status": "entregue",
     "autor_id": "U02",
     "data": "2026-08-28T15:00:00.000Z"
    },
    {
     "status": "concluida",
     "autor_id": "U06",
     "data": "2026-08-28T21:00:00.000Z"
    }
   ]
  },
  {
   "id": "C05",
   "proposta_id": "R09",
   "contratante_id": "U01",
   "perfil_profissional_id": "P02",
   "valor_combinado": 580,
   "status": "concluida",
   "data_inicio": "2026-08-12",
   "data_conclusao": "2026-08-22",
   "historico": [
    {
     "status": "concluida",
     "autor_id": "U01",
     "data": "2026-08-22T21:00:00.000Z"
    }
   ]
  },
  {
   "id": "C06",
   "proposta_id": "R10",
   "contratante_id": "U06",
   "perfil_profissional_id": "P04",
   "valor_combinado": 1400,
   "status": "concluida",
   "data_inicio": "2026-08-20",
   "data_conclusao": "2026-08-24",
   "historico": [
    {
     "status": "concluida",
     "autor_id": "U06",
     "data": "2026-08-24T21:00:00.000Z"
    }
   ]
  }
 ],
 "conversa": [
  {
   "id": "V01",
   "contratacao_id": "C01",
   "ultima_atividade": "2026-09-19T21:40:00.000Z"
  },
  {
   "id": "V02",
   "contratacao_id": "C02",
   "ultima_atividade": "2026-09-19T13:00:00.000Z"
  },
  {
   "id": "V03",
   "contratacao_id": "C03",
   "ultima_atividade": "2026-09-10T23:00:00.000Z"
  },
  {
   "id": "V04",
   "contratacao_id": "C04",
   "ultima_atividade": "2026-08-28T21:00:00.000Z"
  },
  {
   "id": "V05",
   "contratacao_id": "C05",
   "ultima_atividade": "2026-08-22T21:00:00.000Z"
  },
  {
   "id": "V06",
   "contratacao_id": "C06",
   "ultima_atividade": "2026-08-24T21:00:00.000Z"
  }
 ],
 "mensagem": [
  {
   "id": "M01",
   "conversa_id": "V01",
   "remetente_id": "U02",
   "texto": "Posso iniciar às 9h no sábado.",
   "anexo": "",
   "data": "2026-09-19T21:30:00.000Z",
   "lida": true
  },
  {
   "id": "M02",
   "conversa_id": "V01",
   "remetente_id": "U01",
   "texto": "Perfeito, o horário funciona.",
   "anexo": "",
   "data": "2026-09-19T21:40:00.000Z",
   "lida": true
  },
  {
   "id": "M03",
   "conversa_id": "V02",
   "remetente_id": "U05",
   "texto": "Olá, Carla! Qual a melhor data para começar?",
   "anexo": "",
   "data": "2026-09-19T13:00:00.000Z",
   "lida": false
  },
  {
   "id": "M04",
   "conversa_id": "V03",
   "remetente_id": "U04",
   "texto": "As fotos já estão no link enviado por e-mail.",
   "anexo": "",
   "data": "2026-09-10T14:00:00.000Z",
   "lida": true
  }
 ],
 "avaliacao": [
  {
   "id": "A01",
   "contratacao_id": "C03",
   "autor_id": "U01",
   "avaliado_id": "U04",
   "nota": 5,
   "comentario": "Fotos lindas e entregues antes do prazo.",
   "criado_em": "2026-09-11T13:00:00.000Z"
  },
  {
   "id": "A02",
   "contratacao_id": "C04",
   "autor_id": "U06",
   "avaliado_id": "U02",
   "nota": 5,
   "comentario": "Serviço concluído no prazo e muito organizado.",
   "criado_em": "2026-08-29T13:00:00.000Z"
  },
  {
   "id": "A03",
   "contratacao_id": "C04",
   "autor_id": "U02",
   "avaliado_id": "U06",
   "nota": 5,
   "comentario": "Contratante pontual e comunicação clara.",
   "criado_em": "2026-08-29T15:00:00.000Z"
  },
  {
   "id": "A04",
   "contratacao_id": "C05",
   "autor_id": "U01",
   "avaliado_id": "U03",
   "nota": 5,
   "comentario": "Projeto excelente, entendeu exatamente o que eu queria.",
   "criado_em": "2026-08-23T13:00:00.000Z"
  },
  {
   "id": "A05",
   "contratacao_id": "C06",
   "autor_id": "U06",
   "avaliado_id": "U05",
   "nota": 4,
   "comentario": "Bom acabamento, atrasou meio dia.",
   "criado_em": "2026-08-25T13:00:00.000Z"
  }
 ],
 "notificacao": [
  {
   "id": "N01",
   "destinatario_id": "U02",
   "tipo": "proposta",
   "texto": "Sua proposta para \"Iluminação da sala\" foi aceita.",
   "link": "#/contratacoes/C01",
   "lida": true,
   "data": "2026-09-16T12:00:00.000Z"
  },
  {
   "id": "N02",
   "destinatario_id": "U01",
   "tipo": "mensagem",
   "texto": "Rafael Souza enviou uma mensagem em \"Pintura do quarto\".",
   "link": "#/contratacoes/C02",
   "lida": false,
   "data": "2026-09-19T13:00:00.000Z"
  },
  {
   "id": "N03",
   "destinatario_id": "U01",
   "tipo": "proposta",
   "texto": "Nova proposta recebida em \"Instalação de chuveiro\".",
   "link": "#/demandas/D02",
   "lida": false,
   "data": "2026-09-22T13:00:00.000Z"
  },
  {
   "id": "N04",
   "destinatario_id": "U02",
   "tipo": "mudanca_status",
   "texto": "A proposta para \"Instalação de ventilador\" foi visualizada.",
   "link": "#/propostas",
   "lida": false,
   "data": "2026-09-21T15:00:00.000Z"
  }
 ]
};
