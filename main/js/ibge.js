
const estadoSelect = document.getElementById("estado");
const cidadeSelect = document.getElementById("cidade");

// Carregar estados do Brasil
fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
    .then(response => response.json())
    .then(estados => {
        estados.forEach(estado => {
            const option = document.createElement("option");
            option.value = estado.id;       // ID do estado (ideal para backend)
            option.textContent = estado.nome;
            estadoSelect.appendChild(option);
        });
    })
    .catch(() => {
        alert("Erro ao carregar estados.");
    });

// Quando selecionar um estado
estadoSelect.addEventListener("change", function () {
    cidadeSelect.innerHTML = '<option value="">Selecione a Cidade</option>';
    cidadeSelect.disabled = true;

    if (!this.value) return;

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${this.value}/municipios?orderBy=nome`)
        .then(response => response.json())
        .then(cidades => {
            cidades.forEach(cidade => {
                const option = document.createElement("option");
                option.value = cidade.id;    // ID da cidade
                option.textContent = cidade.nome;
                cidadeSelect.appendChild(option);
            });
            cidadeSelect.disabled = false;
        })
        .catch(() => {
            alert("Erro ao carregar cidades.");
        });
});

