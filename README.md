# athgrow. — Sunset Jekyll theme

노을의 피치·코랄·라벤더 색감을 담은 GitHub Pages용 Jekyll 블로그입니다.

## GitHub Pages에 적용하기

1. 저장소 `allsii/athgrow.github.io`의 기존 파일을 먼저 백업합니다.
2. 이 폴더의 파일을 저장소 루트에 업로드합니다. 기존 파일이 있다면 덮어쓰기 전에 확인하세요.
3. GitHub 저장소의 **Settings → Pages**에서 배포 소스를 `Deploy from a branch`, 브랜치를 `main`(또는 기본 브랜치), 폴더를 `/ (root)`로 설정합니다.
4. 저장 후 Actions 탭에서 Pages 빌드가 완료될 때까지 기다립니다.
5. `https://allsii.github.io/`에서 확인합니다.

## 글 추가하기

`_posts` 폴더에 `YYYY-MM-DD-title.md` 형식으로 파일을 만듭니다.

```yaml
---
layout: post
title: "글 제목"
date: 2026-11-10 18:00:00 +0900
categories: development
description: "글 요약"
---

본문을 Markdown으로 작성하세요.
```

## 설정 변경

- 사이트 이름과 설명: `_config.yml`
- 소개 페이지: `about.md`
- 색상과 레이아웃: `assets/css/style.css`
- 다크/라이트 전환: `assets/js/theme.js`

## 참고

GitHub Pages는 저장소 설정과 빌드 상태에 따라 게시까지 몇 분 걸릴 수 있습니다. 이 패키지는 테마 파일을 제공하며, 저장소에 직접 푸시하거나 배포를 완료한 것은 아닙니다.
