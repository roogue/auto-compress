Add-Type -AssemblyName System.Windows.Forms

$fileDialog = New-Object System.Windows.Forms.OpenFileDialog
$fileDialog.Filter = "Video Files (*.mp4;*.avi;*.mkv)|*.mp4;*.avi;*.mkv"
$fileDialog.Title = "Select a video file"

if ($fileDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $fileDialog.FileName
} else {
    Write-Output "UserCancelled"
}
