$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$fixtureDirectory = Join-Path $PSScriptRoot '..\test-results'
New-Item -ItemType Directory -Force -Path $fixtureDirectory | Out-Null
$fixtures = @(
  @{ Gender = [System.Speech.Synthesis.VoiceGender]::Female; File = 'ai-check-heera.wav' },
  @{ Gender = [System.Speech.Synthesis.VoiceGender]::Male; File = 'ai-check-ravi.wav' }
)
$indianEnglish = [System.Globalization.CultureInfo]::GetCultureInfo('en-IN')
foreach ($fixture in $fixtures) {
  $fixturePath = [System.IO.Path]::GetFullPath((Join-Path $fixtureDirectory $fixture['File']))
  $speech = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $speech.SelectVoiceByHints($fixture['Gender'], [System.Speech.Synthesis.VoiceAge]::Adult, 0, $indianEnglish)
    $speech.Rate = 0
    $speech.SetOutputToWaveFile($fixturePath)
    $speech.Speak('Yesterday I went to the market and bought some vegetables. After a short pause, I continued speaking at my normal speed.')
  } finally {
    $speech.Dispose()
  }
  Get-Item -LiteralPath $fixturePath | Select-Object Name, Length
}
