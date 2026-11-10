# 가드너 그로우

몬스테라와 올리브나무, 흙과 돌봄을 기록하는 Garden Grow용 GitHub Pages Jekyll 테마입니다. 초록과 흙빛을 중심으로 한 반응형 레이아웃, 사이드바 카테고리, 게시글 검색, 브라우저 글쓰기·사진 첨부, GitHub 댓글, 다크 모드를 제공합니다.

## 설치

이 폴더의 `_config.yml`, `index.html`, `_layouts/`, `_posts/`, `assets/`, `archive.html`, `about.md`, `write.html`을 `athgrow/athgrow.github.io` 저장소 최상위에 복사하세요. 기존 파일은 먼저 백업하고, 기존 글은 삭제하지 말고 필요한 부분을 합치세요. GitHub Pages에서 `main` 브랜치와 `/(root)`를 배포 대상으로 선택합니다.

저장소가 공개 API에서 보이지 않는 경우에는 먼저 GitHub에서 `athgrow/athgrow.github.io` 저장소를 만들거나 공개 설정을 확인해야 합니다.

## 글쓰기와 사진 첨부

`/write/`에서 제목·본문·카테고리·태그를 작성하고 JPG, PNG, GIF, WebP 사진을 최대 5장까지 첨부할 수 있습니다. 글은 GitHub API를 통해 `_posts/`와 `assets/uploads/`에 하나의 커밋으로 저장됩니다. 작성자는 해당 저장소만 선택한 Fine-grained Personal Access Token의 `Contents: Read and write` 권한이 필요합니다. 토큰은 저장하지 않고 게시 시에만 GitHub API로 전송합니다.

## 댓글

댓글은 Utterances를 사용합니다. 공개 저장소에서 Issues를 켜고 [Utterances GitHub 앱](https://github.com/apps/utterances)을 `athgrow/athgrow.github.io`에 설치해야 합니다. 방문자는 GitHub 로그인과 앱 승인이 필요하며 댓글은 공개 GitHub Issue로 저장됩니다.

## 사용자 설정

`_config.yml`의 `github_username`, `url`, `baseurl`을 실제 값에 맞게 유지하세요. 다른 저장소를 사용하면 `write.html`의 `editor_repo`와 브랜치를 확인하고, 댓글 저장소가 다르면 `comments_repo: 소유자/저장소`를 추가합니다.
