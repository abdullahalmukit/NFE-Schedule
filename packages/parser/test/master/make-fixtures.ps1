# Builds the master-data import fixtures (docs/MASTER_DATA_IMPORT.md section 3)
# with Microsoft Word and Excel on Windows:
#   powershell -ExecutionPolicy Bypass -File packages/parser/test/master/make-fixtures.ps1
# Word or Excel is only closed when no other document is open.
# The CSV and JSON fixtures are plain text and kept as they are in git.
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "fixtures"

$faculty = @(
  @("Short Name", "Teacher Name", "Designation", "Dept.", "E-mail", "Mobile", "Office Room"),
  @("DAMR", "Dr. Abdul Malek Rahman", "Associate Professor", "NFE", "damr@example.edu", "+8801711000001", "AB-1: 501"),
  @("SIS", "Sadia Islam Shanta", "Lecturer", "NFE", "sis@example.edu", "01711000002", "AB-1: 502"),
  @("NI", "Nazmul Islam", "Assistant Professor", "ITM", "ni@example.edu", "", ""),
  @("AMT", "Ayesha Mahmud Tania", "Senior Lecturer", "NFE", "", "01711000004", "AB-1: 503"),
  @("FAN", "Farhan Ahmed Nabil", "Lecturer", "NFE", "fan@example.edu", "", "AB-1: 504"),
  @("AS", "Arif Sultan", "Professor", "NFE", "as@example.edu", "01711000006", "AB-1: 505")
)
$courses = @(
  @("Course Code", "Course Title", "Credit", "Type"),
  @("0531-1103", "Food Chemistry", "3", "Theory"),
  @("0531-1104", "Food Chemistry Lab", "1.5", "Lab"),
  @("0222-111", "Bangladesh Studies", "3", "Theory"),
  @("AOL 0223-111", "Art of Living", "2", "Theory"),
  @("0531-2105", "Food Microbiology", "3", "Theory"),
  @("0531-2106", "Food Microbiology Lab", "1.5", "Sessional")
)

function Add-Table($doc, $data) {
  $range = $doc.Content
  $range.Collapse(0)
  $table = $doc.Tables.Add($range, $data.Count, $data[0].Count)
  $table.Borders.Enable = 1
  for ($r = 0; $r -lt $data.Count; $r++) {
    for ($c = 0; $c -lt $data[0].Count; $c++) {
      $table.Cell($r + 1, $c + 1).Range.Text = $data[$r][$c]
    }
  }
  $doc.Content.InsertParagraphAfter()
}

function Save-Word($name, $data) {
  $word = New-Object -ComObject Word.Application
  $doc = $word.Documents.Add()
  $doc.PageSetup.Orientation = 1
  $doc.Content.Text = "Department of Nutrition and Food Engineering"
  $doc.Content.InsertParagraphAfter()
  # A small table first: the reader must pick the one whose header matches.
  Add-Table $doc @(@("Prepared by", "Office"), @("Routine committee", "AB-1"))
  Add-Table $doc $data
  foreach ($f in @(@("docx", 16), @("doc", 0), @("pdf", 17))) {
    $path = [string](Join-Path $dir "$name.$($f[0])")
    $format = [int]$f[1]
    $doc.SaveAs([ref]$path, [ref]$format)
  }
  $doc.Close([ref]0)
  if ($word.Documents.Count -eq 0) { try { $word.Quit() } catch { } }
}

function Save-Paragraphs {
  $word = New-Object -ComObject Word.Application
  $doc = $word.Documents.Add()
  $lines = @()
  foreach ($row in $faculty[1..3]) {
    for ($c = 0; $c -lt $faculty[0].Count; $c++) {
      if ($row[$c]) { $lines += "$($faculty[0][$c]): $($row[$c])" }
    }
    $lines += ""
  }
  $doc.Content.Text = ($lines -join "`r")
  $path = [string](Join-Path $dir "faculty-paragraphs.docx")
  $format = 16
  $doc.SaveAs([ref]$path, [ref]$format)
  $doc.Close([ref]0)
  if ($word.Documents.Count -eq 0) { try { $word.Quit() } catch { } }
}

function Save-Excel {
  $excel = New-Object -ComObject Excel.Application
  $excel.DisplayAlerts = $false
  $book = $excel.Workbooks.Add()
  while ($book.Worksheets.Count -lt 3) { $book.Worksheets.Add() | Out-Null }
  $sheets = @(@("Notes", $null), @("Faculty", $faculty), @("Courses", $courses))
  for ($i = 0; $i -lt 3; $i++) {
    $ws = $book.Worksheets.Item($i + 1)
    $ws.Name = $sheets[$i][0]
    $data = $sheets[$i][1]
    if (-not $data) { $ws.Cells.Item(1, 1).Value2 = "Fill the Faculty and Courses sheets."; continue }
    # The table starts on row 3 under a title, like files made by hand.
    $ws.Cells.Item(1, 1).Value2 = "$($sheets[$i][0]) list"
    for ($r = 0; $r -lt $data.Count; $r++) {
      for ($c = 0; $c -lt $data[0].Count; $c++) {
        $ws.Cells.Item($r + 3, $c + 1).NumberFormat = "@"
        $ws.Cells.Item($r + 3, $c + 1).Value2 = $data[$r][$c]
      }
    }
  }
  $book.SaveAs([string](Join-Path $dir "master.xlsx"), 51)
  $book.Close($false)
  if ($excel.Workbooks.Count -eq 0) { try { $excel.Quit() } catch { } }
}

New-Item -ItemType Directory -Force $dir | Out-Null
Save-Word "faculty" $faculty
Save-Word "courses" $courses
Save-Paragraphs
Save-Excel
"fixtures written to $dir"
