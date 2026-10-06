# pull 전에 읽어 주세요 (2026-10-06 정리)

저장소에서 일부 파일을 추적 대상에서 제거했음. 그래서 pull 하면 내 로컬에 있던 파일이 지워지거나 pull 이 실패할 수 있음. 아래대로 하면 안전함.

pull 하기 전에도 이 문서를 보는 방법
- `git fetch origin`
- `git show origin/main:docs/pull-notice.md`

## 1. pull 전에 백업할 것

| 파일 | 무슨 일이 생기나 | 백업 방법 |
| --- | --- | --- |
| `.claude/settings.local.json` | 저장소에서 제거되어 pull 하면 지워지거나, 로컬에서 수정했다면 pull 이 실패함 | `cp .claude/settings.local.json ~/settings.local.json.backup` |
| `node_modules/` | 저장소 추적에서 제거됨. pull 하면 지워질 수 있음 | 백업 불필요. pull 후 `npm install` 로 복원 |

## 2. pull 순서

1. 위 백업을 먼저 함.
2. 내 작업 중인 변경이 있으면 커밋하거나 `git stash` 로 보관함.
3. `git pull --rebase`
4. `npm install`
5. 백업한 `settings.local.json` 이 지워졌으면 `cp ~/settings.local.json.backup .claude/settings.local.json` 으로 되돌림.

## 3. 이제 git 에 올라가지 않는 파일

`.gitignore` 에 추가되어 커밋되지 않음. 로컬 파일은 그대로 유지됨.
- `node_modules/`, `.DS_Store`
- `.claude/settings.local.json` (개인 Claude 로컬 설정)
- `submission/`, `wiki-writing.zip`, `wiki-writing_기능명세서.md`

## 4. 배포용 dist 는 계속 git 에 올라감

`Dockerfile` 이 `dist/` 를 그대로 복사하므로 `dist/` 는 추적 대상으로 유지함.
- 소스 수정은 루트 `index.html` 과 `src/` 에서 함. `dist/` 를 직접 고치지 않음 (빌드가 덮어씀).
- 배포용 빌드는 `DEPLOY_BASE=./ npm run build` 로 하고, `dist/index.html` 의 `index.js`, `index.css`, `tab-*.js` 경로 끝에 `?v=<현재 시각 epoch>` 를 붙임.
- 폰트는 `dist/fonts/` 에 두고 `dist` 루트에 중복 파일을 두지 않음.
