'use strict';
/* Social — Çok Oyunculu & Sosyal (2. Liste: C. #21–#30). ADDITIVE; mevcut mp/netcode ile uyumlu. */
const _soc = { key: 'ahmet_social', d: null,
  load() { if (this.d) return this.d; try { this.d = JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { this.d = {}; } this.d.friends = this.d.friends || []; this.d.clan = this.d.clan || null; return this.d; },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) {} } };

// #21 Gerçek zamanlı 4 kişilik yarış (mprooms köprü + oda modeli)
const RaceRoom = { max: 4, players: [],
  create(host) { this.players = [{ id: host || 'me', ready: false }]; return true; },
  join(id) { if (this.players.length >= this.max) return false; if (this.players.find(function (p) { return p.id === id; })) return true; this.players.push({ id: id, ready: false }); return true; },
  ready(id) { const p = this.players.find(function (x) { return x.id === id; }); if (p) p.ready = true; return this.allReady(); },
  allReady() { return this.players.length >= 2 && this.players.every(function (p) { return p.ready; }); } };
// #22 Arkadaş ekleme + davet
const Friends = {
  list() { return _soc.load().friends; },
  add(id) { const d = _soc.load(); if (d.friends.indexOf(id) >= 0) return true; if (!id) return false; d.friends.push(id); _soc.save(); return true; },
  remove(id) { const d = _soc.load(); const i = d.friends.indexOf(id); if (i >= 0) { d.friends.splice(i, 1); _soc.save(); return true; } return false; },
  invite(id) { return { to: id, code: 'INV-' + (id || 'x').toString().slice(0, 6).toUpperCase() }; } };
// #23 Klan / lonca
const Clan = {
  current() { return _soc.load().clan; },
  create(name) { const d = _soc.load(); d.clan = { name: String(name || 'KLAN').slice(0, 16), members: ['me'], score: 0 }; _soc.save(); return d.clan; },
  join(name) { const d = _soc.load(); d.clan = { name: name, members: ['me'], score: 0 }; _soc.save(); return d.clan; },
  leave() { const d = _soc.load(); d.clan = null; _soc.save(); return true; },
  addScore(n) { const d = _soc.load(); if (d.clan) { d.clan.score += n || 0; _soc.save(); } return d.clan ? d.clan.score : 0; } };
// #24 Haftalık klan savaşları
const ClanWar = {
  weekId() { return Math.floor(Date.now() / (7 * 86400000)); },
  make(a, b) { return { week: this.weekId(), a: { name: a, score: 0 }, b: { name: b, score: 0 }, add(side, n) { this[side].score += n || 0; }, winner() { return this.a.score === this.b.score ? null : (this.a.score > this.b.score ? this.a.name : this.b.name); } }; } };
// #25 Sohbet + emote
const Chat = {
  emotes: ['👍', '😂', '🔥', '😱', '🏆', 'gg', 'wow'], _log: [],
  send(from, msg) { const m = { t: Date.now(), from: from || 'me', msg: String(msg).slice(0, 120) }; this._log.push(m); if (this._log.length > 100) this._log.shift(); return m; },
  emote(from, e) { if (this.emotes.indexOf(e) < 0) return false; return this.send(from, e); },
  recent(n) { return this._log.slice(-(n || 20)); } };
// #26 Arkadaş hayaleti indirme (netcode AsyncGhost köprü)
const FriendGhost = { _store: {},
  save(friendId, mapId, ghost) { this._store[friendId + ':' + mapId] = ghost; return true; },
  load(friendId, mapId) { return this._store[friendId + ':' + mapId] || null; },
  posAt(friendId, mapId, t) { const g = this.load(friendId, mapId); return (typeof AsyncGhost !== 'undefined' && g) ? AsyncGhost.posAt(g, t) : null; } };
// #27 Meydan okuma gönderme
const Challenge = {
  make(to, mapId, target) { return { id: 'CH-' + Math.random().toString(36).slice(2, 8).toUpperCase(), to: to, mapId: mapId, target: target, status: 'pending' }; },
  result(ch, score) { ch.status = score >= ch.target ? 'won' : 'lost'; return ch.status; } };
// #28 Turnuva bracket
const Tournament = {
  seed(players) { const p = (players || []).slice(); const rounds = []; let cur = p.map(function (x) { return { name: x }; });
    while (cur.length > 1) { const next = []; for (let i = 0; i < cur.length; i += 2) next.push({ a: cur[i], b: cur[i + 1] || { name: 'BYE' } }); rounds.push(next); cur = next.map(function () { return { name: 'TBD' }; }); }
    return rounds; },
  advance(match, winnerName) { match.winner = winnerName; return winnerName; } };
// #29 Canlı izleme (netcode Spectator köprü)
const Spectate = { watching: null, watch(playerId) { this.watching = playerId; if (typeof Spectator !== 'undefined') Spectator.reset(); return true; }, frameAt(now) { return (typeof Spectator !== 'undefined') ? Spectator.frameAt(now) : null; } };
// #30 Liderlik tablosu (global + arkadaş)
const Leaderboard = {
  _scores: [],
  submit(name, score) { this._scores.push({ name: name, score: score }); this._scores.sort(function (a, b) { return b.score - a.score; }); if (this._scores.length > 200) this._scores.length = 200; return this.rank(name); },
  top(n) { return this._scores.slice(0, n || 10); },
  friends() { const f = (typeof Friends !== 'undefined' ? Friends.list() : []).concat('me'); return this._scores.filter(function (s) { return f.indexOf(s.name) >= 0; }); },
  rank(name) { for (let i = 0; i < this._scores.length; i++) if (this._scores[i].name === name) return i + 1; return -1; } };

const Social = {
  version: '1.0',
  systems: ['RaceRoom', 'Friends', 'Clan', 'ClanWar', 'Chat', 'FriendGhost', 'Challenge', 'Tournament', 'Spectate', 'Leaderboard'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { RaceRoom.create('a'); RaceRoom.join('b'); RaceRoom.ready('a'); r.raceroom = RaceRoom.ready('b') === true; } catch (e) { r.raceroom = false; }
    try { Friends.add('ali'); r.friends = Friends.list().indexOf('ali') >= 0 && !!Friends.invite('ali').code; } catch (e) { r.friends = false; }
    try { Clan.create('KURTLAR'); Clan.addScore(50); r.clan = Clan.current().score === 50; Clan.leave(); } catch (e) { r.clan = false; }
    try { const w = ClanWar.make('A', 'B'); w.add('a', 10); r.clanwar = w.winner() === 'A'; } catch (e) { r.clanwar = false; }
    try { Chat.send('me', 'selam'); r.chat = Chat.emote('me', '🔥') !== false && Chat.recent(5).length >= 2; } catch (e) { r.chat = false; }
    try { FriendGhost.save('ali', 'm', [[0, 0, 0]]); r.friendghost = FriendGhost.load('ali', 'm') !== null; } catch (e) { r.friendghost = false; }
    try { const ch = Challenge.make('ali', 'm', 100); r.challenge = Challenge.result(ch, 150) === 'won'; } catch (e) { r.challenge = false; }
    try { const t = Tournament.seed(['a', 'b', 'c', 'd']); r.tournament = t.length >= 2; } catch (e) { r.tournament = false; }
    try { Spectate.watch('x'); r.spectate = Spectate.watching === 'x'; } catch (e) { r.spectate = false; }
    try { Leaderboard._scores = []; Leaderboard.submit('me', 500); Leaderboard.submit('o', 900); r.leaderboard = Leaderboard.rank('o') === 1; } catch (e) { r.leaderboard = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.RaceRoom = RaceRoom; window.Friends = Friends; window.Clan = Clan; window.ClanWar = ClanWar; window.Chat = Chat; window.FriendGhost = FriendGhost; window.Challenge = Challenge; window.Tournament = Tournament; window.Spectate = Spectate; window.Leaderboard = Leaderboard; window.Social = Social; }
