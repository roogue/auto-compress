FILE=$(zenity --file-selection --title="Select a video file" --file-filter="*.mp4 *.avi *.mkv")

if [ $? == 0 ]; then
    echo "$FILE"
else
    echo "UserCancelled"
fi