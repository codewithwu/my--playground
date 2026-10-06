#!/usr/bin/env python3
# publish-hot.py — Convert `hot` CLI text output into hot-news.json.
#
# Reads the CLI's plain-text output on stdin and overwrites the JSON file the
# hot-news web page reads. The agent stays responsible for intent; this script
# only reshapes data it already has.
#
#   sh scripts/run-cli.sh hot --limit 10 | python3 scripts/publish-hot.py
#
# Options:
#   --out PATH   output file (default: <dir>/hot-news.json)
#   --dir  PATH  directory holding hot-news.html (default: current directory)

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import date as _date

HEADER = re.compile(r'^【.*?】\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?')
ITEM = re.compile(r'^(\d+)\.\s*标题\s*[:：]\s*(.*)$')
FIELD = re.compile(r'^\s*(标题|摘要|来源|发布时间|链接)\s*[:：]\s*(.*)$')
TOTAL = re.compile(r'^共\s*(\d+)\s*条')
# `hot`/`search` report "2026-10-06 17:02:57"; `morning`/`evening` have no
# timestamp at all. Seconds are tolerated on input but dropped — the page
# renders HH:MM, and a bare-seconds match failure would push the whole
# timestamp into `date` and leave `time` empty.
STAMP = re.compile(r'^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2})(?::\d{2})?)?$')
WEEKDAYS = '一二三四五六日'

FIELDS = ('title', 'summary', 'source', 'published', 'url')


def strip_tracking(url):
    """Drop skill-internal tracking params; keep the real article address."""
    if not url:
        return ''
    url = re.sub(r'([?&])scene=[^&#]*', lambda m: m.group(1), url)
    return re.sub(r'[?&]$', '', url).rstrip('?&').replace('?&', '?')


def parse(text):
    header_date, header_time = '', ''
    items = []
    current = None
    field = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue

        m = HEADER.match(line.strip())
        if m and not header_date:
            header_date, header_time = m.group(1), m.group(2) or ''
            continue

        m = ITEM.match(line)
        if m:
            current = {'rank': int(m.group(1))}
            current['title'] = m.group(2).strip()
            field = 'title'
            items.append(current)
            continue

        m = FIELD.match(line)
        if m and current is not None:
            field = FIELDS[('标题', '摘要', '来源', '发布时间', '链接').index(m.group(1))]
            current[field] = (current.get(field, '') + '\n' + m.group(2).strip()).strip()
            continue

        # CLI already gave the total; a new item always has a 标题, so a bare
        # number line can never be mistaken for one.
        m = TOTAL.match(line.strip())
        if m:
            continue

        if current is not None and field:
            current[field] = (current.get(field, '') + '\n' + line.strip()).strip()

    return header_date, header_time, items


def to_item(raw, order, list_date):
    published = raw.get('published', '')
    date_part, time_part = '', ''
    m = STAMP.match(published)
    if m:
        date_part, time_part = m.group(1), m.group(2) or ''
    elif published:
        date_part = published.strip()

    title = raw.get('title', '').strip()
    summary = raw.get('summary', '').strip()
    if summary == title:      # CLI echoes the title when there is no real summary
        summary = ''

    return {
        'rank': raw.get('rank') or order,
        'title': title,
        'source': raw.get('source', '').strip(),
        'date': date_part or list_date,
        'time': time_part,
        'summary': summary,
        'url': strip_tracking(raw.get('url', '').strip()),
    }


def write_atomic(path, payload):
    directory = os.path.dirname(os.path.abspath(path)) or '.'
    fd, tmp = tempfile.mkstemp(dir=directory, prefix='.hot-news-', suffix='.json')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out')
    ap.add_argument('--dir', dest='directory', default='.')
    args = ap.parse_args()

    text = sys.stdin.read()
    if not text.strip():
        print('publish-hot: CLI 没有返回任何内容', file=sys.stderr)
        return 1

    header_date, header_time, raw_items = parse(text)
    if not raw_items:
        print('publish-hot: 没能从输出里解析出新闻条目，请检查 CLI 输出格式',
              file=sys.stderr)
        return 1

    list_date = header_date or _date.today().isoformat()

    if header_date:
        try:
            wd = WEEKDAYS[_date.fromisoformat(header_date).isoweekday() - 1]
            date_label = '%d年%d月%d日' % (_date.fromisoformat(header_date).year,
                                          _date.fromisoformat(header_date).month,
                                          _date.fromisoformat(header_date).day)
        except ValueError:
            wd, date_label = '', header_date
    else:
        wd, date_label = '', list_date

    payload = {
        'date': list_date,
        'dateLabel': date_label,
        'weekday': '周' + wd if wd else '',
        'updatedAt': header_time or '',
        'source': '腾讯新闻',
        'note': '热度榜位次随时变动',
        'items': [to_item(r, i + 1, list_date) for i, r in enumerate(raw_items)],
    }

    out = args.out or os.path.join(args.directory, 'hot-news.json')
    write_atomic(out, payload)

    missing = [i['rank'] for i in payload['items'] if not i['url']]
    print('publish-hot: 已写入 %s（%d 条）' % (out, len(payload['items'])))
    if missing:
        print('publish-hot: 缺少链接的条目：%s' % missing, file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
