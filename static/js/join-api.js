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
    $('codeLoginForm').hidden = true;
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
      msg.textContent = '';
      return loadJoin();
    }).catch(function (err) {
      msg.textContent = err.message;
    });
  });

  // 密码登录 / 验证码登录切换
  $('toCodeLogin').addEventListener('click', function (e) {
    e.preventDefault();
    $('loginForm').hidden = true;
    $('codeLoginForm').hidden = false;
    $('codeLoginMsg').textContent = '';
    $('codeEmail').focus();
  });
  $('toPwdLogin').addEventListener('click', function (e) {
    e.preventDefault();
    $('codeLoginForm').hidden = true;
    $('loginForm').hidden = false;
    $('loginMsg').textContent = '';
    $('loginEmail').focus();
  });

  // 验证码登录：发送验证码
  var loginCodeTimer = null;
  $('sendLoginCodeBtn').addEventListener('click', function () {
    var btn = $('sendLoginCodeBtn');
    var email = $('codeEmail').value.trim();
    var msg = $('codeLoginMsg');
    msg.className = 'auth-msg';
    if (!email) { msg.textContent = '请先填写邮箱'; return; }
    btn.disabled = true;
    msg.textContent = '正在发送…';
    var fd = new URLSearchParams();
    fd.set('email', email);
    api('/api/login-code/send', {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (data) {
      msg.className = 'auth-msg ok';
      msg.textContent = data.msg || '验证码已发送';
      var left = 60;
      btn.textContent = left + 's';
      loginCodeTimer = setInterval(function () {
        left -= 1;
        btn.textContent = left > 0 ? left + 's' : '发送验证码';
        if (left <= 0) { clearInterval(loginCodeTimer); btn.disabled = false; }
      }, 1000);
    }).catch(function (err) {
      msg.textContent = err.message;
      btn.disabled = false;
    });
  });

  // 验证码登录：校验并登录
  $('codeLoginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('codeLoginMsg');
    msg.className = 'auth-msg';
    msg.textContent = '正在登录…';
    var fd = new URLSearchParams();
    fd.set('email', $('codeEmail').value.trim());
    fd.set('code', $('codeCode').value.trim());
    api('/api/login-code/verify', {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (data) {
      setToken(data.token);
      msg.textContent = '';
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
      msg.textContent = '';
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
      var g = document.querySelector('input[name="gender"][value="' + (reg.gender || '') + '"]');
      if (g) g.checked = true;
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

  /* ---------------- 提交 ---------------- */
  var form = $('joinForm');
  var btn = $('submitBtn');
  var joinMsg = $('joinMsg');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    joinMsg.className = 'hint center';
    joinMsg.textContent = '';
    if (!token()) { showAuth('login'); return; }

    var fd = new FormData(form);
    fd.set('survey', $('surveyField').value);
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = '正在提交…';

    fetch(API + '/api/join', {
      method: 'POST',
      body: fd,
      headers: { 'Authorization': 'Bearer ' + token() }
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (err) { /* 非 JSON */ }
        if (!res.ok || (data && data.ok === false)) {
          if (res.status === 401) { setToken(''); showAuth('login'); return null; }
          throw new Error((data && data.msg) || ('提交失败（HTTP ' + res.status + '）'));
        }
        return data;
      });
    }).then(function (data) {
      btn.disabled = false;
      btn.textContent = label;
      if (!data) return;
      $('doneTitle').textContent = data.updated ? '修改成功！' : '报名成功！';
      $('doneText').textContent = ($('name').value || '同学') + '，你的报名信息已' + (data.updated ? '更新' : '提交') + '。';
      show('doneCard');
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = label;
      joinMsg.textContent = err.message;
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
