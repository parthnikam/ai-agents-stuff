import streamlit as st
from datetime import datetime, timedelta
from google_tools import (
    list_calendar_events,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
    list_gmail_messages,
    read_gmail_message,
    create_gmail_draft,
    send_gmail_message,
    search_drive_files,
    read_drive_file,
)

st.set_page_config(
    page_title="Google Tools UI",
    page_icon="🔧",
    layout="wide",
)

st.title("📊 Google Tools Dashboard")
st.markdown("Manage your Google Calendar, Gmail, and Drive with a simple interface")

# Sidebar for navigation
with st.sidebar:
    st.header("Navigation")
    selected_tool = st.radio(
        "Choose a tool:",
        [
            "📅 Calendar",
            "📧 Gmail",
            "📁 Google Drive",
        ],
    )

# Calendar Section
if selected_tool == "📅 Calendar":
    st.header("📅 Google Calendar")
    
    calendar_tab1, calendar_tab2, calendar_tab3, calendar_tab4 = st.tabs(
        ["List Events", "Create Event", "Update Event", "Delete Event"]
    )
    
    with calendar_tab1:
        st.subheader("List Upcoming Events")
        days = st.slider("Days to look ahead:", 1, 30, 7)
        
        if st.button("📋 List Events", key="list_events"):
            with st.spinner("Fetching events..."):
                try:
                    result = list_calendar_events(days)
                    st.success("Events retrieved!")
                    st.text_area("Events:", result, height=300)
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    
    with calendar_tab2:
        st.subheader("Create New Event")
        with st.form("create_event_form"):
            title = st.text_input("Event Title *", placeholder="Team Meeting")
            col1, col2 = st.columns(2)
            with col1:
                start_date = st.date_input("Start Date *", datetime.now())
                start_time = st.time_input("Start Time *", datetime.now().time())
            with col2:
                end_date = st.date_input("End Date *", datetime.now() + timedelta(hours=1))
                end_time = st.time_input("End Time *", (datetime.now() + timedelta(hours=1)).time())
            
            description = st.text_area("Description (optional)", placeholder="Event details...")
            location = st.text_input("Location (optional)", placeholder="Meeting Room A")
            
            if st.form_submit_button("✅ Create Event"):
                if not title:
                    st.error("Please enter an event title")
                else:
                    try:
                        start_iso = datetime.combine(start_date, start_time).isoformat()
                        end_iso = datetime.combine(end_date, end_time).isoformat()
                        
                        result = create_calendar_event(
                            title=title,
                            start_iso=start_iso,
                            end_iso=end_iso,
                            description=description if description else None,
                            location=location if location else None,
                        )
                        st.success(result)
                    except Exception as e:
                        st.error(f"Error creating event: {str(e)}")
    
    with calendar_tab3:
        st.subheader("Update Event")
        event_id = st.text_input("Event ID *", placeholder="Your event ID")
        
        with st.form("update_event_form"):
            title = st.text_input("New Event Title (leave blank to keep current)")
            
            col1, col2 = st.columns(2)
            with col1:
                start_date = st.date_input("New Start Date (optional)", value=None)
                start_time = st.time_input("New Start Time (optional)", value=None)
            with col2:
                end_date = st.date_input("New End Date (optional)", value=None)
                end_time = st.time_input("New End Time (optional)", value=None)
            
            description = st.text_area("New Description (leave blank to keep current)", placeholder="Event details...")
            location = st.text_input("New Location (leave blank to keep current)", placeholder="Meeting Room A")
            
            if st.form_submit_button("🔄 Update Event"):
                if not event_id:
                    st.error("Please enter an event ID")
                else:
                    try:
                        kwargs = {
                            "event_id": event_id,
                            "title": title if title else None,
                            "description": description if description else None,
                            "location": location if location else None,
                        }
                        
                        if start_date and start_time:
                            kwargs["start_iso"] = datetime.combine(start_date, start_time).isoformat()
                        if end_date and end_time:
                            kwargs["end_iso"] = datetime.combine(end_date, end_time).isoformat()
                        
                        result = update_calendar_event(**kwargs)
                        st.success(result)
                    except Exception as e:
                        st.error(f"Error updating event: {str(e)}")
    
    with calendar_tab4:
        st.subheader("Delete Event")
        event_id = st.text_input("Event ID to delete *", placeholder="Your event ID", key="delete_event_id")
        
        if st.button("🗑️ Delete Event", key="delete_event_btn"):
            if not event_id:
                st.error("Please enter an event ID")
            else:
                try:
                    result = delete_calendar_event(event_id)
                    st.success(result)
                except Exception as e:
                    st.error(f"Error deleting event: {str(e)}")

# Gmail Section
elif selected_tool == "📧 Gmail":
    st.header("📧 Gmail")
    
    gmail_tab1, gmail_tab2, gmail_tab3, gmail_tab4 = st.tabs(
        ["Search Messages", "Read Message", "Create Draft", "Send Message"]
    )
    
    with gmail_tab1:
        st.subheader("Search Gmail Messages")
        with st.form("search_gmail_form"):
            query = st.text_input("Search Query *", placeholder="from:someone@example.com subject:meeting")
            max_results = st.slider("Max Results:", 1, 50, 10)
            
            if st.form_submit_button("🔍 Search"):
                if not query:
                    st.error("Please enter a search query")
                else:
                    with st.spinner("Searching messages..."):
                        try:
                            result = list_gmail_messages(query, max_results)
                            st.session_state["gmail_search_results"] = result
                            st.session_state["selected_gmail_message_id"] = None
                            st.success("Search completed!")
                        except Exception as e:
                            st.error(f"Error searching messages: {str(e)}")

        results = st.session_state.get("gmail_search_results", [])
        selected_message_id = st.session_state.get("selected_gmail_message_id")

        if results:
            message_list_col, message_detail_col = st.columns([2, 3])

            with message_list_col:
                st.caption(f"{len(results)} message(s)")
                for message in results:
                    subject = message["subject"]
                    sender = message["sender"]
                    date = message["date"]
                    preview = message["snippet"]
                    label = subject if len(subject) <= 80 else f"{subject[:77]}..."

                    if st.button(label, key=f"gmail_result_{message['id']}", use_container_width=True):
                        st.session_state["selected_gmail_message_id"] = message["id"]
                        selected_message_id = message["id"]

                    st.caption(f"{sender} | {date}")
                    if preview:
                        st.caption(preview)
                    st.divider()

            with message_detail_col:
                if selected_message_id:
                    with st.spinner("Loading message..."):
                        try:
                            message_content = read_gmail_message(selected_message_id)
                            st.text_area("Selected Message", message_content, height=520)
                        except Exception as e:
                            st.error(f"Error loading message: {str(e)}")
                else:
                    st.info("Select a message to read it here.")
        elif "gmail_search_results" in st.session_state:
            st.info("No matching Gmail messages.")
    
    with gmail_tab2:
        st.subheader("Read Gmail Message")
        message_id = st.text_input("Message ID *", placeholder="Your message ID")
        
        if st.button("📖 Read Message"):
            if not message_id:
                st.error("Please enter a message ID")
            else:
                with st.spinner("Loading message..."):
                    try:
                        result = read_gmail_message(message_id)
                        st.success("Message loaded!")
                        st.text_area("Message Content:", result, height=400)
                    except Exception as e:
                        st.error(f"Error reading message: {str(e)}")
    
    with gmail_tab3:
        st.subheader("Create Gmail Draft")
        with st.form("create_draft_form"):
            to = st.text_input("To (Email Address) *", placeholder="recipient@example.com")
            subject = st.text_input("Subject *", placeholder="Email subject")
            body = st.text_area("Message Body *", placeholder="Write your message here...")
            
            if st.form_submit_button("✏️ Create Draft"):
                if not to or not subject or not body:
                    st.error("Please fill in all required fields")
                else:
                    try:
                        result = create_gmail_draft(to, subject, body)
                        st.success(result)
                    except Exception as e:
                        st.error(f"Error creating draft: {str(e)}")
    
    with gmail_tab4:
        st.subheader("Send Gmail Message")
        with st.form("send_email_form"):
            to = st.text_input("To (Email Address) *", placeholder="recipient@example.com", key="send_to")
            subject = st.text_input("Subject *", placeholder="Email subject", key="send_subject")
            body = st.text_area("Message Body *", placeholder="Write your message here...", key="send_body")
            
            col1, col2 = st.columns(2)
            with col1:
                submit = st.form_submit_button("📤 Send Message")
            with col2:
                st.info("⚠️ This will send the email immediately")
            
            if submit:
                if not to or not subject or not body:
                    st.error("Please fill in all required fields")
                else:
                    try:
                        result = send_gmail_message(to, subject, body)
                        st.success(result)
                    except Exception as e:
                        st.error(f"Error sending message: {str(e)}")

# Google Drive Section
elif selected_tool == "📁 Google Drive":
    st.header("📁 Google Drive")
    
    drive_tab1, drive_tab2 = st.tabs(["Search Files", "Read File"])
    
    with drive_tab1:
        st.subheader("Search Drive Files")
        with st.form("search_drive_form"):
            query = st.text_input("Search Query *", placeholder="name contains 'report'")
            max_results = st.slider("Max Results:", 1, 50, 10)
            
            if st.form_submit_button("🔍 Search"):
                if not query:
                    st.error("Please enter a search query")
                else:
                    with st.spinner("Searching files..."):
                        try:
                            result = search_drive_files(query, max_results)
                            st.success("Search completed!")
                            st.text_area("Files:", result, height=400)
                        except Exception as e:
                            st.error(f"Error searching files: {str(e)}")
    
    with drive_tab2:
        st.subheader("Read Drive File")
        file_id = st.text_input("File ID *", placeholder="Your file ID")
        
        if st.button("📄 Read File"):
            if not file_id:
                st.error("Please enter a file ID")
            else:
                with st.spinner("Loading file..."):
                    try:
                        result = read_drive_file(file_id)
                        st.success("File loaded!")
                        st.text_area("File Content:", result, height=400)
                    except Exception as e:
                        st.error(f"Error reading file: {str(e)}")

# Footer
st.markdown("---")
st.markdown(
    """
    <div style="text-align: center; color: gray; font-size: 12px;">
    🔐 All interactions use your Google OAuth credentials securely
    </div>
    """,
    unsafe_allow_html=True,
)
