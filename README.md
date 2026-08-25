# 🤖 Discord Moderation Bot Template

디스코드 관리 봇 템플릿 - Discord.js v14, TypeScript, JSON 기반

> 디스호스트(DisHost) 유저를 위한 완전한 관리 봇 템플릿입니다.

## ✨ 주요 기능

### 1️⃣ 환영 & 자동 역할 시스템

- ✅ 신규 멤버 환영 메시지 (커스터마이징 가능)
- ✅ 자동 역할 지급
- ✅ 퇴장 메시지
- ✅ 변수 지원: `{user}`, `{username}`, `{server}`, `{memberCount}`

### 2️⃣ 반응 역할 시스템

- ✅ 이모지 클릭으로 역할 자동 지급/회수
- ✅ 유니코드 & 커스텀 이모지 지원
- ✅ 반응 역할 패널 자동 생성
- ✅ 무제한 반응 역할 설정

### 3️⃣ 기본 관리 기능

- ✅ 메시지 일괄 삭제 (Purge)
- ✅ 멤버 추방 (Kick)
- ✅ 멤버 차단 (Ban)
- ✅ 모든 관리 행동 자동 로깅

### 4️⃣ 체류기간 + 활동량 자동 등급

- ✅ `새내기 → 학사 → 석사 → 박사` 자동 승급
- ✅ 학사: 서버 7일 이상 + 메시지 50개 이상
- ✅ 석사: 서버 30일 이상 + 메시지 300개 이상
- ✅ 박사: 서버 90일 이상 + 메시지 1,000개 이상
- ✅ 한 사용자에게 하나의 등급 역할만 유지
- ✅ 실시간 메시지 집계 및 6시간마다 체류기간 재검사
- ✅ `/활동통계수집`으로 접근 가능한 과거 메시지 전체 1회 집계
- ✅ `/등급현황`으로 본인의 등급 진행 상황 확인
- ✅ 모든 슬래시 명령어 응답은 실행한 본인에게만 표시

### 5️⃣ 기술 스택

- **Discord.js v14** - 최신 디스코드 API
- **TypeScript** - 타입 안정성
- **JSON** - 간단한 파일 기반 저장소
- **한국어 Localization** - 완벽한 한글 지원

---

## 📋 명령어 목록

### 환영 시스템

| 명령어           | 설명                          | 권한      |
| ---------------- | ----------------------------- | --------- |
| `/welcome-setup` | 환영 메시지 및 자동 역할 설정 | 서버 관리 |
| `/leave-setup`   | 퇴장 메시지 설정              | 서버 관리 |

### 반응 역할

| 명령어                  | 설명                    | 권한      |
| ----------------------- | ----------------------- | --------- |
| `/reaction-role-add`    | 메시지에 반응 역할 추가 | 역할 관리 |
| `/reaction-role-remove` | 반응 역할 제거          | 역할 관리 |
| `/reaction-role-list`   | 반응 역할 목록 조회     | 역할 관리 |
| `/reaction-role-panel`  | 반응 역할 패널 생성     | 역할 관리 |

### 분야 역할

| 명령어 | 설명 | 권한 |
| --- | --- | --- |
| `/역할설정` | 분야 역할을 여러 개 지정하거나 삭제 | 모든 멤버 |

`/역할설정`은 `반도체/소자`, `전자회로/전기`, `코딩/AI`, `기계/제작`, `화학/재료`, `우주/항공`, `원자력/핵`, `기타`만 변경하며 다른 역할은 건드리지 않습니다.

### 관리 기능

| 명령어                | 설명                     | 권한        |
| --------------------- | ------------------------ | ----------- |
| `/purge [개수]`       | 메시지 일괄 삭제 (1-100) | 메시지 관리 |
| `/kick [유저] [사유]` | 멤버 추방                | 멤버 추방   |
| `/ban [유저] [사유]`  | 멤버 차단                | 멤버 차단   |

### 홍보 시스템

| 명령어 | 설명 | 권한 |
| --- | --- | --- |
| `/홍보설정 [채널]` | 자동 게시 채널 설정 | 서버 관리 |
| `/홍보신청 [링크] [이미지1~5]` | 긴 글 작성창에서 줄바꿈 본문과 사진 최대 5장을 홍보로 게시 | 모든 멤버 |
| `/홍보삭제` | 내가 올린 최근 홍보를 목록에서 선택해 삭제 | 모든 멤버 |

홍보 채널에서 `@everyone`의 **메시지 보내기** 권한을 끄면 일반 잡담은 차단되고 봇이 게시한 홍보만 남습니다. 홍보 재신청 시간 제한은 없습니다.

### 활동 등급

| 명령어          | 설명                                      | 권한      |
| --------------- | ----------------------------------------- | --------- |
| `/등급기준`     | 자동 등급별 체류기간·메시지 조건 확인      | 모든 멤버 |
| `/등급현황`     | 체류기간·메시지 수와 다음 등급 진행도 확인 | 모든 멤버 |
| `/활동통계수집` | 접근 가능한 모든 과거 메시지를 다시 집계   | 서버 관리 |
| `/활동순위`     | 메시지 활동량 상위 20명 확인               | 모든 멤버 |
| `/전체통계`     | 서버 전체 활동량과 등급별 인원 확인        | 모든 멤버 |

> Discord에서 명령어가 영어로 표시되면 `/rank-criteria`, `/rank-status`, `/activity-scan`, `/activity-leaderboard`, `/activity-summary`를 사용하세요.
> 모든 명령어 결과에는 `🔒 이 메시지는 본인에게만 표시됩니다.` 문구가 나오며, 실행한 사람 외에는 볼 수 없습니다.
> 봇 역할은 `새내기`, `학사`, `석사`, `박사` 역할보다 위에 있어야 합니다.

---

## 🚀 디스호스트에서 실행

### 1. 디스호스트에서 템플릿으로 생성

### 2. 환경 변수 설정

`.env` 파일을 열어 다음 값을 설정하세요:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

### 3. 봇 실행

---

## 🚀 빠른 시작

### 1. 저장소 복제

```bash
git clone https://github.com/dishostkr/template-moderation.git
cd template-moderation
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 열어 다음 값을 설정하세요:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

### 4. 봇 실행

#### 개발 모드

```bash
npm run dev
```

#### 프로덕션 모드

```bash
npm run build
npm start
```

---

## 🔧 디스코드 봇 설정

### 1. Discord Developer Portal 설정

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **New Application** 클릭
3. **Bot** 탭에서 봇 생성
4. **Token** 복사 → `.env`의 `DISCORD_TOKEN`에 입력
5. **OAuth2 → General**에서 **Client ID** 복사 → `.env`의 `DISCORD_CLIENT_ID`에 입력

### 2. 필수 봇 권한 설정

**OAuth2 → URL Generator**에서 다음 권한 선택:

#### Scopes

- ✅ `bot`
- ✅ `applications.commands`

#### Bot Permissions

- ✅ Manage Roles
- ✅ Kick Members
- ✅ Ban Members
- ✅ Manage Messages
- ✅ Send Messages
- ✅ Embed Links
- ✅ Read Message History
- ✅ Add Reactions
- ✅ Use External Emojis

### 3. 필수 인텐트 활성화

**Bot** 탭에서 다음 인텐트를 활성화하세요:

- ✅ **Server Members Intent**
- ✅ **Message Content Intent** (선택사항)

### 4. 봇 초대

생성된 URL로 봇을 서버에 초대하세요.

---

## 📂 프로젝트 구조

```
template-moderation/
├── data/                      # JSON 데이터 저장소
│   ├── guilds.json           # 서버 설정
│   ├── reaction-roles.json   # 반응 역할
│   └── moderation-logs.json  # 관리 로그
├── src/
│   ├── commands/
│   │   ├── welcome/           # 환영 시스템 명령어
│   │   │   ├── welcome-setup.ts
│   │   │   └── leave-setup.ts
│   │   ├── roles/             # 반응 역할 명령어
│   │   │   ├── reaction-role-add.ts
│   │   │   ├── reaction-role-remove.ts
│   │   │   ├── reaction-role-list.ts
│   │   │   └── reaction-role-panel.ts
│   │   ├── moderation/        # 관리 명령어
│   │   │   ├── purge.ts
│   │   │   ├── kick.ts
│   │   │   └── ban.ts
│   │   └── index.ts
│   ├── events/                # 이벤트 핸들러
│   │   ├── guildMemberAdd.ts
│   │   ├── guildMemberRemove.ts
│   │   ├── messageReactionAdd.ts
│   │   └── messageReactionRemove.ts
│   ├── services/
│   │   ├── database.ts        # JSON 데이터베이스
│   │   └── localization.ts    # 한국어 지원
│   ├── utils/
│   │   └── embed.ts           # 임베드 헬퍼
│   ├── locales/
│   │   └── ko.json            # 한국어 번역
│   ├── config.ts              # 환경 변수
│   ├── index.ts               # 엔트리 포인트
│   └── deploy-commands.ts     # 명령어 배포
├── .env                       # 환경 변수
├── package.json
└── tsconfig.json
```

---

## 💡 사용 예시

### 환영 시스템 설정

```
/welcome-setup channel:#환영 role:@멤버 message:환영합니다 {user}님! {server}의 {memberCount}번째 멤버입니다!
```

### 반응 역할 설정

1. 패널 생성:

```
/reaction-role-panel title:역할 선택 description:아래 이모지를 클릭하여 역할을 받으세요!
```

2. 역할 추가:

```
/reaction-role-add message_id:1234567890 emoji:🎮 role:@게이머
/reaction-role-add message_id:1234567890 emoji:🎨 role:@아티스트
```

### 관리 기능

```
/purge amount:50
/kick user:@유저 reason:스팸
/ban user:@유저 reason:악성 행동 delete_days:7
```

---

## 🗄️ 데이터 구조

### Guild (서버 설정)

- 환영 채널 ID
- 환영 메시지
- 퇴장 채널 ID
- 퇴장 메시지
- 자동 역할 ID

### ReactionRole (반응 역할)

- 메시지 ID
- 이모지
- 역할 ID
- 채널 ID

### ModerationLog (관리 로그)

- 관리자 ID
- 대상 유저 ID
- 행동 종류 (kick/ban/purge)
- 사유
- 타임스탬프

모든 데이터는 `data/` 폴더의 JSON 파일에 자동으로 저장됩니다.

---

## 🛠️ 개발 가이드

### 새 명령어 추가

1. `src/commands/` 하위에 파일 생성
2. `src/commands/index.ts`에 import 및 export 추가
3. `src/locales/ko.json`에 번역 추가

### 새 이벤트 추가

1. `src/events/` 하위에 핸들러 생성
2. `src/index.ts`에서 이벤트 등록

---

## 📦 배포

### 디스호스트(DisHost) 배포

1. 저장소를 GitHub에 푸시
2. 디스호스트 패널에서 봇 생성
3. 환경 변수 설정
4. 자동 배포

### 일반 서버 배포

```bash
npm run build
node dist/index.js
```

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🙏 출처 표기

이 템플릿을 사용한 프로젝트는 다음과 같이 출처를 표기해주세요:

```
이 프로젝트는 dishostkr/template-moderation을 기반으로 합니다.
https://github.com/dishostkr/template-moderation
```

---

## 📞 지원

- [디스호스트 공식 웹사이트](https://dishost.kr)
- [디스호스트 디스코드](https://discord.gg/dishost)

---

Made with ❤️ by [DisHost](https://dishost.kr)

