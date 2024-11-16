import { useState, useEffect } from "react"
import { FIELDS } from './fields';
import { FieldName } from "./fields";

interface DataSourceItem {
  name: string;
  xpath: string | null;
}

interface FormData {
    [FIELDS.PATIENT_NAME]: string;
    [FIELDS.AGE]: string;
    [FIELDS.DOCTOR_NAME]: string;
    [FIELDS.DOCTOR_DEPARTMENT]: string;
    [FIELDS.ADDRESS]: string;
    [FIELDS.GENDER]: string;
    [FIELDS.BOOKING_TYPE]: string;
  }
  const fieldMapping: { [key in FieldName]: keyof FormData } = {
    [FIELDS.PATIENT_NAME]: FIELDS.PATIENT_NAME,
    [FIELDS.AGE]: FIELDS.AGE,
    [FIELDS.DOCTOR_NAME]: FIELDS.DOCTOR_NAME,
    [FIELDS.DOCTOR_DEPARTMENT]: FIELDS.DOCTOR_DEPARTMENT,
    [FIELDS.ADDRESS]: FIELDS.ADDRESS,
    [FIELDS.GENDER]: FIELDS.GENDER,
    [FIELDS.BOOKING_TYPE]: FIELDS.BOOKING_TYPE
  };

function Sidepanel() {
  console.log("sidepanel rendering")
  const [activeTab, setActiveTab] = useState("home")
  const [tabId, setTabId] = useState<number | null>(null)
  const [isSelectingDataSource, setIsSelectingDataSource] = useState(false)
  const [currentlySelectingField, setCurrentlySelectingField] = useState<string | null>(null)
  const [dataSources, setDataSources] = useState<DataSourceItem[]>(
    Object.values(FIELDS).map(field => ({ name: field, xpath: null }))
  );

  const [formData, setFormData] = useState<FormData>({
    [FIELDS.PATIENT_NAME]: '',
    [FIELDS.AGE]: '',
    [FIELDS.DOCTOR_NAME]: '',
    [FIELDS.DOCTOR_DEPARTMENT]: '',
    [FIELDS.ADDRESS]: '',
    [FIELDS.GENDER]: '',
    [FIELDS.BOOKING_TYPE]: ''
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        setTabId(tabs[0].id)
        // Retrieve stored data sources
        chrome.runtime.sendMessage({ type: "GET_STORED_DATA", key: "dataSources" }, (response) => {
          if (response && response.dataSources) {
            console.log("Received stored data:", response.dataSources)
            setDataSources(response.dataSources)
          }
        })
      }
    })

    const messageListener = (message: any, sender: any, sendResponse: any) => {
        if (message.type === "DATA_SOURCE_SELECTED") {
          console.log("Received DATA_SOURCE_SELECTED message:", message)
          updateDataSource(currentlySelectingField, message.xpath)
          setIsSelectingDataSource(false)
          setCurrentlySelectingField(null)
        } else if (message.type === "DATA_UPDATED") {
          console.log("Received DATA_UPDATED message:", message)
          updateFormData(message.field, message.data)
        }
      }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [currentlySelectingField])

  const selectDataSource = (fieldName: string) => {
    console.log("Selecting data source for:", fieldName)
    setIsSelectingDataSource(true)
    setCurrentlySelectingField(fieldName)
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        type: "SELECT_DATA_SOURCE"
      })
    }
  }

  const updateDataSource = (fieldName: string | null, xpath: string) => {
    console.log("Updating data source:", fieldName, xpath)
    setDataSources(prevDataSources => {
      const updatedDataSources = prevDataSources.map(item => 
        item.name === fieldName ? { ...item, xpath } : item
      )
      console.log("Updated data sources:", updatedDataSources)
      chrome.runtime.sendMessage({ 
        type: "SET_STORED_DATA", 
        key: "dataSources", 
        value: updatedDataSources 
      })
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { 
          type: "SETUP_DATA_SOURCE_MONITORING",
          dataSources: updatedDataSources
        })
      }
      return updatedDataSources
    })
  }

  const updateFormData = (field: FieldName, value: string) => {
    console.log(`Updating form data for ${field} with value:`, value);
    setFormData(prevData => {
      let newValue = value;
      
      if (field === FIELDS.GENDER) {
        newValue = value.toLowerCase();
        if (!["male", "female", "other"].includes(newValue)) {
          newValue = "other";
        }
      } else if (field === FIELDS.BOOKING_TYPE) {
        newValue = value.toLowerCase();
        if (!["booking", "walkin"].includes(newValue)) {
            console.log("i got a new value in booking caalled : ",newValue)
          newValue = 'booking';
        }
      }

      return { ...prevData, [field]: newValue };
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormData(name as FieldName, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you can add logic to send the form data to your backend or process it as needed
  };
  const renderHome = () => (
    <div>
      <h2>Home</h2>
      <form onSubmit={handleSubmit}>
        {Object.values(FIELDS).map((field) => (
          <div key={field} style={{ marginBottom: '10px' }}>
            <label htmlFor={field}>{field}: </label>
            {field === FIELDS.GENDER || field === FIELDS.BOOKING_TYPE ? (
              <select
                id={field}
                name={field}
                value={formData[field]}
                onChange={handleInputChange}
                required
              >
                <option value="">Select {field}</option>
                {field === FIELDS.GENDER ? (
                  <>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="booking">Booking</option>
                    <option value="walkin">Walk-in</option>
                  </>
                )}
              </select>
            ) : (
              <input
                type={field === FIELDS.AGE ? "number" : "text"}
                id={field}
                name={field}
                value={formData[field]}
                onChange={handleInputChange}
                required
              />
            )}
          </div>
        ))}
        <button type="submit" style={{/* ... */}}>Submit</button>
      </form>
    </div>
  );

  // Update renderSettings function
  const renderSettings = () => (
    <div>
      <h2>Settings</h2>
      {dataSources.map((item, index) => (
        <div key={index} style={{ marginBottom: "20px" }}>
          <strong>{item.name}: </strong>
          <button 
            onClick={() => selectDataSource(item.name as FieldName)}
            style={{/* ... */}}
          >
            {/* ... */}
          </button>
          {item.xpath && (
            <div style={{ marginTop: "10px", wordBreak: "break-all" }}>
              <strong>Selected XPath:</strong> {item.xpath}
            </div>
          )}
        </div>
      ))}
    </div>
  );


  console.log("Current data sources:", dataSources)
  console.log("Current form data:", formData)

  return (
    <div style={{ padding: "20px" }}>
      <h1>NeoFlow Data Integrator</h1>
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <button 
          onClick={() => setActiveTab("home")}
          style={{
            padding: "10px",
            fontSize: "16px",
            backgroundColor: activeTab === "home" ? "lightblue" : "white",
            marginRight: "10px"
          }}
        >
          Home
        </button>
        <button 
          onClick={() => setActiveTab("settings")}
          style={{
            padding: "10px",
            fontSize: "16px",
            backgroundColor: activeTab === "settings" ? "lightblue" : "white"
          }}
        >
          Settings
        </button>
      </div>
      {activeTab === "home" ? renderHome() : renderSettings()}
    </div>
  )
}

export default Sidepanel