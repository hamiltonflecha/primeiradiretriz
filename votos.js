/* ===================================================
   Votação por seção - Primeira Diretriz
   Conecta com o Supabase para registrar likes/dislikes.
   Cada visitante só pode votar uma vez por seção
   (controlado por localStorage no navegador).
   =================================================== */
(function () {
  "use strict";

  var SUPABASE_URL = "https://bgnkehamvsqqdjcdwtyc.supabase.co";
  var SUPABASE_KEY = "sb_publishable_nSzWyiSr9yTtRSwLxTW0aA_2j4EJLwg";

  function chaveVoto(secaoId) {
    return "voto_" + secaoId;
  }

  function jaVotou(secaoId) {
    try {
      return localStorage.getItem(chaveVoto(secaoId));
    } catch (e) {
      return null;
    }
  }

  function salvarVoto(secaoId, tipo) {
    try {
      localStorage.setItem(chaveVoto(secaoId), tipo);
    } catch (e) {
      /* localStorage indisponível - segue sem bloquear voto repetido */
    }
  }

  function chamarSupabase(caminho, opcoes) {
    opcoes = opcoes || {};
    var headers = {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    };
    return fetch(SUPABASE_URL + caminho, {
      method: opcoes.method || "GET",
      headers: headers,
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
    }).then(function (r) {
      if (!r.ok) {
        throw new Error("Supabase HTTP " + r.status);
      }
      return r.json();
    });
  }

  function buscarContagens(ids) {
    if (ids.length === 0) return Promise.resolve([]);
    var lista = ids.join(",");
    var filtro = encodeURIComponent("(" + lista + ")");
    return chamarSupabase(
      "/rest/v1/votos?secao_id=in." + filtro + "&select=secao_id,likes,dislikes"
    );
  }

  function votar(secaoId, tipo) {
    return chamarSupabase("/rest/v1/rpc/votar", {
      method: "POST",
      body: { p_secao_id: secaoId, p_tipo: tipo }
    });
  }

  function textoAviso(container) {
    return container.querySelector(".votacao-aviso");
  }

  function atualizarVisual(container, likes, dislikes, votoSalvo) {
    var likeBtn = container.querySelector('[data-tipo="like"]');
    var dislikeBtn = container.querySelector('[data-tipo="dislike"]');
    var likeSpan = likeBtn ? likeBtn.querySelector(".voto-contagem") : null;
    var dislikeSpan = dislikeBtn
      ? dislikeBtn.querySelector(".voto-contagem")
      : null;

    if (likeSpan) likeSpan.textContent = likes;
    if (dislikeSpan) dislikeSpan.textContent = dislikes;

    if (votoSalvo) {
      if (likeBtn) likeBtn.disabled = true;
      if (dislikeBtn) dislikeBtn.disabled = true;
      var atual = container.querySelector('[data-tipo="' + votoSalvo + '"]');
      if (atual) atual.classList.add("votado");
      var aviso = textoAviso(container);
      if (aviso) aviso.textContent = "Você já votou aqui. Obrigado!";
    }
  }

  function ligarCliques(container, secaoId) {
    var botoes = container.querySelectorAll(".voto-btn, .voto-btn-mini");
    for (var i = 0; i < botoes.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          if (jaVotou(secaoId)) return;
          var tipo = btn.getAttribute("data-tipo");
          for (var j = 0; j < botoes.length; j++) botoes[j].disabled = true;

          votar(secaoId, tipo)
            .then(function (resultado) {
              var linha = resultado && resultado[0];
              if (linha) {
                atualizarVisual(container, linha.likes, linha.dislikes, tipo);
              }
              salvarVoto(secaoId, tipo);
            })
            .catch(function () {
              for (var j = 0; j < botoes.length; j++) botoes[j].disabled = false;
              var aviso = textoAviso(container);
              if (aviso) {
                aviso.textContent =
                  "Não foi possível registrar o voto agora. Tente novamente mais tarde.";
              }
            });
        });
      })(botoes[i]);
    }
  }

  function iniciar() {
    var containers = document.querySelectorAll("[data-secao]");
    if (containers.length === 0) return;

    var ids = [];
    for (var i = 0; i < containers.length; i++) {
      ids.push(containers[i].getAttribute("data-secao"));
    }

    buscarContagens(ids)
      .then(function (linhas) {
        var mapa = {};
        for (var i = 0; i < linhas.length; i++) {
          mapa[linhas[i].secao_id] = linhas[i];
        }
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          var id = c.getAttribute("data-secao");
          var dados = mapa[id] || { likes: 0, dislikes: 0 };
          atualizarVisual(c, dados.likes, dados.dislikes, jaVotou(id));
          ligarCliques(c, id);
        }
      })
      .catch(function () {
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          var id = c.getAttribute("data-secao");
          ligarCliques(c, id);
          var votoSalvo = jaVotou(id);
          if (votoSalvo) atualizarVisual(c, 0, 0, votoSalvo);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
