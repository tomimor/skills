---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

armame el mail de novedades de esta semana para los usuarios. cambios:
- feat(clientes): filtro por estado de DFE en la tabla de clientes
- feat(reportes): export a excel del reporte de monotributo, con columna de categoria
- fix: el saldo de CCMA no se actualizaba si el cliente tenia mas de un CUIT asociado
- chore: refactor del hook useClientes
- los filtros los pidieron varios estudios por whatsapp
