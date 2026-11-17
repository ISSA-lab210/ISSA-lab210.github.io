/* WYE · 邑安实验室 —— GitHub Pages 静态报名页逻辑
   数据通过 JSON API 回传 NAS（token 认证，不依赖第三方 Cookie）。 */
(function () {
  'use strict';

  var API = 'https://25f8b8a8443b44b4a4e269b48442d7fc.hn.takin.cc';
  var TOKEN_KEY = 'lab210_token';

  var $ = function (id) { return document.getElementById(id); };
  var token = function () { return localStorage.getItem(TOKEN_KEY) || ''; };
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {});
    if (token()) opts.headers['Authorization'] = 'Bearer ' + token();
    return fetch(API + path, opts).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { /* 非 JSON */ }
        if (!res.ok || (data && data.ok === false)) {
          var err = new Error((data && data.msg) || ('请求失败（HTTP ' + res.status + '）'));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------------- 视图切换 ---------------- */
  function show(view) {
    ['loadingNote', 'authCard', 'joinCard', 'doneCard'].forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = (id !== view);
    });
  }

  function showAuth(tab) {
    show('authCard');
    document.querySelectorAll('.auth-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-auth') === tab);
    });
    $('loginForm').hidden = tab !== 'login';
    $('registerForm').hidden = tab !== 'register';
  }

  /* ---------------- 登录 / 注册 ---------------- */
  document.querySelectorAll('.auth-tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showAuth(b.getAttribute('data-auth')); });
  });

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('loginMsg');
    msg.className = 'auth-msg';
    msg.textContent = '正在登录…';
    var fd = new URLSearchParams();
    fd.set('email', $('loginEmail').value.trim());
    fd.set('password', $('loginPassword').value);
    api('/api/login', {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (data) {
      setToken(data.token);
      return loadJoin();
    }).catch(function (err) {
      msg.textContent = err.message;
    });
  });

  var codeTimer = null;
  $('sendCodeBtn').addEventListener('click', function () {
    var btn = $('sendCodeBtn');
    var email = $('regEmail').value.trim();
    var msg = $('regMsg');
    msg.className = 'auth-msg';
    if (!email) { msg.textContent = '请先填写邮箱'; return; }
    btn.disabled = true;
    msg.textContent = '正在发送…';
    var fd = new URLSearchParams();
    fd.set('email', email);
    api('/api/send-code', {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (data) {
      msg.className = 'auth-msg ok';
      msg.textContent = data.msg || '验证码已发送';
      var left = 60;
      btn.textContent = left + 's';
      codeTimer = setInterval(function () {
        left -= 1;
        btn.textContent = left > 0 ? left + 's' : '发送验证码';
        if (left <= 0) { clearInterval(codeTimer); btn.disabled = false; }
      }, 1000);
    }).catch(function (err) {
      msg.textContent = err.message;
      btn.disabled = false;
    });
  });

  $('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('regMsg');
    msg.className = 'auth-msg';
    var p1 = $('regPassword').value;
    var p2 = $('regPassword2').value;
    if (p1 !== p2) { msg.textContent = '两次输入的密码不一致'; return; }
    msg.textContent = '正在注册…';
    var fd = new URLSearchParams();
    fd.set('email', $('regEmail').value.trim());
    fd.set('code', $('regCode').value.trim());
    fd.set('password', p1);
    api('/api/register', {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (data) {
      setToken(data.token);
      return loadJoin();
    }).catch(function (err) {
      msg.textContent = err.message;
    });
  });

  $('logoutBtn').addEventListener('click', function () {
    setToken('');
    $('accountEmail').textContent = '';
    showAuth('login');
  });

  /* ---------------- 报名表 ---------------- */
  function currentDir() {
    var el = document.querySelector('input[name="direction"]:checked');
    return el ? el.value : '';
  }
  function branchKey(dir) {
    if (dir.indexOf('信号') >= 0) return 'signal';
    if (dir.indexOf('边缘') >= 0) return 'edge';
    return '';
  }
  function syncSurvey(clearHidden) {
    var dir = currentDir();
    var key = branchKey(dir);
    document.querySelectorAll('.survey-branch').forEach(function (b) {
      var showIt = b.getAttribute('data-branch') === key;
      b.hidden = !showIt;
      b.querySelectorAll('input[type="radio"]').forEach(function (r) {
        r.required = showIt;
        if (!showIt && clearHidden) r.checked = false;
      });
    });
    var level = document.querySelector('.survey-branch[data-branch="' + (key || 'none') + '"] input:checked');
    var val = dir ? '方向：' + dir : '';
    if (level) val += (val ? '；' : '') + '了解程度：' + level.value;
    $('surveyField').value = val;
  }
  document.querySelectorAll('input[name="direction"], .survey-branch input').forEach(function (el) {
    el.addEventListener('change', function () { syncSurvey(true); });
  });

  function fillForm(reg, email, deadline, closed) {
    $('accountEmail').textContent = email;
    $('staticEmail').textContent = email;
    $('joinCard').hidden = false;
    $('doneCard').hidden = true;
    show('joinCard');

    if (deadline) {
      $('deadlineTip').hidden = false;
      $('deadlineTip').innerHTML = closed
        ? '本次报名已于 <strong>' + deadline + '</strong> 截止。'
        : '本次报名截止：<strong>' + deadline + '</strong>';
    }

    if (reg) {
      $('name').value = reg.name || '';
      $('student_id').value = reg.student_id || '';
      $('college').value = reg.college || '';
      $('major').value = reg.major || '';
      $('intro').value = reg.intro || '';
      $('editNote').hidden = false;
      document.querySelectorAll('input[name="direction"]').forEach(function (r) {
        r.checked = (r.value === reg.direction);
      });
      var sv = reg.survey || '';
      document.querySelectorAll('.survey-branch input').forEach(function (r) {
        r.checked = sv.indexOf(r.value) >= 0;
      });
      ['claude', 'ccswitch', 'conda'].forEach(function (k) {
        if (reg['shot_' + k]) {
          var input = $('shot_' + k);
          var ok = $('ok_' + k);
          if (input) input.required = false;
          if (ok) ok.hidden = false;
        }
      });
    }
    syncSurvey(false);

    if (closed) {
      $('submitBtn').disabled = true;
      $('submitBtn').textContent = '报名已截止';
    }
  }

  function loadJoin() {
    return api('/api/me').then(function (data) {
      fillForm(data.registration, data.email, data.deadline, data.closed);
      return data;
    }).catch(function (err) {
      if (err.status === 401) {
        setToken('');
        showAuth('login');
      } else {
        show('loadingNote');
        $('loadingNote').textContent = err.message;
      }
    });
  }

  /* ---------------- 图片压缩 ---------------- */
  function compress(file) {
    return new Promise(function (resolve) {
      if (!file || !/^image\//.test(file.type || '')) { resolve(file); return; }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var maxSide = 2000;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        if (scale >= 1 && file.size <= 800 * 1024) { resolve(file); return; }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], 'shot.jpg', { type: 'image/jpeg' }));
          } else { resolve(file); }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* ---------------- 提交 ---------------- */
  var KEYS = ['shot_claude', 'shot_ccswitch', 'shot_conda'];
  var form = $('joinForm');
  var btn = $('submitBtn');
  var progress = $('uploadProgress');
  var fill = $('uploadBarFill');
  var tip = $('uploadTip');
  var joinMsg = $('joinMsg');

  function setPct(p) {
    if (fill) fill.style.width = p + '%';
    if (tip) tip.textContent = '正在上传截图 ' + p + '%';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    joinMsg.className = 'hint center';
    joinMsg.textContent = '';
    if (!token()) { showAuth('login'); return; }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = '正在压缩图片…';

    Promise.all(KEYS.map(function (k) {
      var input = $(k);
      var f = input && input.files && input.files[0];
      return f ? compress(f) : Promise.resolve(null);
    })).then(function (shots) {
      var fd = new FormData(form);
      shots.forEach(function (blob, i) {
        if (blob) fd.set(KEYS[i], blob, blob.name || KEYS[i] + '.jpg');
      });
      fd.set('survey', $('surveyField').value);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', API + '/api/join');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token());
      progress.hidden = false;
      setPct(0);
      xhr.upload.addEventListener('progress', function (ev) {
        if (ev.lengthComputable) setPct(Math.min(100, Math.round(ev.loaded / ev.total * 100)));
      });
      xhr.upload.addEventListener('load', function () {
        tip.textContent = '上传完成，服务器处理中…';
      });
      xhr.addEventListener('load', function () {
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (err) { data = null; }
        progress.hidden = true;
        btn.disabled = false;
        btn.textContent = label;
        if (data && data.ok) {
          $('doneTitle').textContent = data.updated ? '修改成功！' : '报名成功！';
          $('doneText').textContent = ($('name').value || '同学') + '，你的报名信息已' + (data.updated ? '更新' : '提交') + '。';
          show('doneCard');
        } else if (xhr.status === 401) {
          setToken('');
          showAuth('login');
        } else {
          joinMsg.textContent = (data && data.msg) || ('提交失败（HTTP ' + xhr.status + '）');
        }
      });
      xhr.addEventListener('error', function () {
        progress.hidden = true;
        btn.disabled = false;
        btn.textContent = label;
        joinMsg.textContent = '网络错误，请检查网络后重试';
      });
      xhr.send(fd);
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = label;
      joinMsg.textContent = '图片处理失败，请重试';
    });
  });

  $('editAgain').addEventListener('click', function () {
    show('joinCard');
  });

  /* ---------------- 启动 ---------------- */
  if (token()) {
    loadJoin();
  } else {
    showAuth('login');
  }
})();
