import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import GamingIcon, { GamingIcons } from "./GamingIcons";
import { useRegistrationAPI } from "@/hooks/useRegistrationAPI";
import { Game, College, SponsorshipTier } from '@/lib/firebase';

// Mini tournaments data
const miniTournaments = [
  { name: "Clash Royale", logo: "/logos/Clash Royale.png" },
  { name: "Street Fighter 6", logo: "/logos/Street_Fighter_6_Logo.png" },
  { name: "Dragon Ball Fighter Z", logo: "/logos/Dragon Ball Fighter Z.png" },
  { name: "FC 26", logo: "/logos/FC26 White.png" },
  { name: "Guilty Gear Strive", logo: "/logos/Guilty Gear Black.png" },
  { name: "King Of Fighters XV", logo: "/logos/King Of Fighters XV.png" },
  { name: "Mortal Kombat 1", logo: "/logos/Mortal Kombat 1 Blue.png" },
  { name: "Ludo", logo: "/logos/Ludo Logo.png" },
  { name: "NBA 2K26", logo: "/logos/NBA 2K26.png" },
  { name: "Dirt Rally 2.0", logo: "/logos/Dirt_Rally_2.0_Logo.svg.png" },
  { name: "Tekken 8", logo: "/logos/Tekken-8-logo White.png" },
  { name: "Tetris", logo: "/logos/Tetris_logo.png" },
];
import { useState, useEffect } from "react";
import TermsAndConditions from "./TermsAndConditions";
import firebaseStorageService from "@/services/firebaseStorageService";
import { AlertCircle, Users } from "lucide-react";

// Component to display registration limit status
interface RegistrationLimitDisplayProps {
  limit: { current: number; limit: number; isFull: boolean } | null;
  isLoading: boolean;
  type: 'college' | 'moba-open' | 'mini-tournament';
}

const RegistrationLimitDisplay = ({ limit, isLoading, type }: RegistrationLimitDisplayProps) => {
  if (isLoading) {
    return (
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Checking registration availability...
        </div>
      </div>
    );
  }

  if (!limit) return null;

  const percentage = (limit.current / limit.limit) * 100;
  const isNearFull = percentage >= 75 && !limit.isFull;

  if (limit.isFull) {
    return (
      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">
              Registration Closed
            </p>
            <p className="text-sm text-red-300/80 mt-1">
              We have reached the maximum capacity of {limit.limit} {type === 'mini-tournament' ? 'participants' : 'teams'} for this tournament.
              Registration is now closed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-4 p-3 rounded-lg border ${isNearFull ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${isNearFull ? 'text-yellow-400' : 'text-green-400'}`} />
          <span className={`text-sm font-medium ${isNearFull ? 'text-yellow-400' : 'text-green-400'}`}>
            {isNearFull ? 'Limited Spots Available!' : 'Registration Open'}
          </span>
        </div>
        <span className={`text-sm ${isNearFull ? 'text-yellow-400' : 'text-green-400'}`}>
          {limit.current} / {limit.limit} {type === 'mini-tournament' ? 'players' : 'teams'}
        </span>
      </div>
      {isNearFull && (
        <p className="text-xs text-yellow-400/80 mt-2">
          Hurry! Only {limit.limit - limit.current} spots remaining.
        </p>
      )}
      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isNearFull ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const RegistrationSection = () => {
  const [registrationType, setRegistrationType] = useState<"college" | "moba-open" | "cosplayer" | "vendor" | "exhibitor" | "media" | "sponsor" | "mini-tournament" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  
  // API hook
  const { 
    loading, 
    error, 
    submitTeamRegistration, 
    submitSponsorRegistration, 
    submitVisitorRegistration,
    submitMediaRegistration,
    getGames,
    getColleges,
    getSponsorshipTiers,
    checkTeamRegistrationLimit,
    checkMiniTournamentLimit
  } = useRegistrationAPI();
  
  // Reference data
  const [games, setGames] = useState<Game[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [sponsorshipTiers, setSponsorshipTiers] = useState<SponsorshipTier[]>([]);

  // Registration limits state
  const [registrationLimit, setRegistrationLimit] = useState<{ current: number; limit: number; isFull: boolean } | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  // Load reference data on component mount (only once)
  useEffect(() => {
    let isMounted = true;
    const loadReferenceData = async () => {
      const [gamesData, collegesData, tiersData] = await Promise.all([
        getGames(),
        getColleges(),
        getSponsorshipTiers(),
      ]);
      
      if (isMounted) {
        if (gamesData) setGames(gamesData);
        if (collegesData) setColleges(collegesData);
        if (tiersData) setSponsorshipTiers(tiersData);
      }
    };
    
    loadReferenceData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check registration limits when registration type changes
  useEffect(() => {
    let isMounted = true;
    const checkLimit = async () => {
      if (!registrationType) {
        if (isMounted) setRegistrationLimit(null);
        return;
      }

      if (isMounted) setIsCheckingLimit(true);

      try {
        if (registrationType === 'college') {
          const result = await checkTeamRegistrationLimit('college');
          if (isMounted) {
            setRegistrationLimit({
              current: result.current,
              limit: result.limit,
              isFull: !result.allowed
            });
          }
        } else if (registrationType === 'moba-open') {
          const result = await checkTeamRegistrationLimit('open_category');
          if (isMounted) {
            setRegistrationLimit({
              current: result.current,
              limit: result.limit,
              isFull: !result.allowed
            });
          }
        } else if (registrationType === 'mini-tournament') {
          // Don't show limit until a game is selected
          if (isMounted) setRegistrationLimit(null);
        }
      } catch (err) {
        console.error('Error checking registration limit:', err);
      } finally {
        if (isMounted) setIsCheckingLimit(false);
      }
    };

    checkLimit();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationType]);

  // Helper function to map sponsor type string to tier ID
  const getSponsorshipTierId = (sponsorType: string, tiers: any[]) => {
    const directMapping: { [key: string]: number } = {
      'Title Sponsor': 1,
      'Powered By Sponsor': 2,
      'Associate Sponsor': 3,
      'Category Partner': 4
    };
    
    return directMapping[sponsorType] || null;
  };
  
  const [formData, setFormData] = useState({
    teamName: "",
    collegeName: "",
    captainName: "",
    captainEmail: "",
    captainPhone: "",
    game: "",
    category: "",
    sponsorType: "",
    companyName: "",
    contactPerson: "",
    companyEmail: "",
    companyPhone: "",
    message: "",
    agreeTerms: false,
    address: "",
    city: "",
    state: "",
    pinCode: "",
    teamMembers: [
      { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null },
      { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null },
      { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null },
      { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null },
      { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null }
    ],
    substitute: { ign: "", gameId: "", fullName: "", studentIdUpload: null as File | null, aadhaarUpload: null as File | null },
    // Mini tournament specific fields
    nickName: "",
    whatsappPhone: "",
    phoneCallNumber: "",
    age: "",
    gender: "",
    passportPhoto: null as File | null,
    // Legacy fields (kept for backward compatibility)
    studentIdUpload: null as File | null,
    aadhaarUpload: null as File | null,
    institutionDeclaration: false,
    livestreamConsent: false,
    coordinatorName: "",
    coordinatorPhone: ""
  });

  // Generate registration ID and set default game when type is selected
  useEffect(() => {
    if (registrationType && !registrationId) {
      const generateId = () => {
        const prefix = registrationType === 'college' ? 'CLG' : 
                       registrationType === 'moba-open' ? 'MOB' :
                       registrationType === 'cosplayer' ? 'COS' :
                       registrationType === 'vendor' ? 'VEN' :
                       registrationType === 'exhibitor' ? 'EXH' :
                       registrationType === 'sponsor' ? 'SPN' : 
                       registrationType === 'media' ? 'MDA' : 
                       registrationType === 'mini-tournament' ? 'MIN' : 'VST';
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const id = `${prefix}${randomNum}`;
        setRegistrationId(id);
      };
      generateId();

      // Auto-set Mobile Legends for college registration
      if (registrationType === 'college') {
        const mobileLegendsGame = games.find(g => g.name === 'Mobile Legends');
        if (mobileLegendsGame) {
          setFormData(prev => ({ ...prev, game: mobileLegendsGame.id.toString() }));
        }
      }
    }
  }, [registrationType, registrationId, games]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamMemberChange = (index: number, field: 'ign' | 'gameId' | 'fullName' | 'studentIdUpload' | 'aadhaarUpload', value: string | File | null) => {
    const updatedMembers = [...formData.teamMembers];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setFormData(prev => ({ ...prev, teamMembers: updatedMembers }));
  };

  // Check mini-tournament limit when game is selected
  useEffect(() => {
    let isMounted = true;
    const checkMiniLimit = async () => {
      if (registrationType === 'mini-tournament' && formData.game) {
        if (isMounted) setIsCheckingLimit(true);
        try {
          const result = await checkMiniTournamentLimit(formData.game);
          if (isMounted) {
            setRegistrationLimit({
              current: result.current,
              limit: result.limit,
              isFull: !result.allowed
            });
          }
        } catch (err) {
          console.error('Error checking mini tournament limit:', err);
        } finally {
          if (isMounted) setIsCheckingLimit(false);
        }
      }
    };

    checkMiniLimit();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.game, registrationType]);

  const handleSubstituteChange = (field: 'ign' | 'gameId' | 'fullName' | 'studentIdUpload' | 'aadhaarUpload', value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      substitute: { ...prev.substitute, [field]: value }
    }));
  };

  const getRequiredTeamSize = () => {
    if (!formData.game) return 5;
    const game = games.find(g => g.id.toString() === formData.game);
    return game?.teamSize || 5;
  };

  const getTeamMemberFields = () => {
    if (registrationType === 'college') {
      return formData.teamMembers.slice(0, 5); // Always 5 players for college Mobile Legends
    }
    const size = getRequiredTeamSize();
    return formData.teamMembers.slice(0, size);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation for college and MOBA open tournaments
    if ((registrationType === 'college' || registrationType === 'moba-open')) {
      // Check if all team members have full names
      const teamMembersWithFullName = getTeamMemberFields();
      for (let i = 0; i < teamMembersWithFullName.length; i++) {
        if (!teamMembersWithFullName[i].fullName.trim()) {
          alert(`Please enter the full name for Player ${i + 1}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Check mandatory fields - different for college vs MOBA
      const teamMembersWithDocs = getTeamMemberFields();
      
      if (registrationType === 'college') {
        // Check all team members have student ID
        for (let i = 0; i < teamMembersWithDocs.length; i++) {
          if (!teamMembersWithDocs[i].studentIdUpload) {
            alert(`Please upload Student ID for Player ${i + 1}`);
            setIsSubmitting(false);
            return;
          }
        }
        // Check substitute has student ID if any substitute details are filled
        if (formData.substitute.fullName || formData.substitute.ign) {
          if (!formData.substitute.studentIdUpload) {
            alert('Please upload Student ID for Substitute Player');
            setIsSubmitting(false);
            return;
          }
        }

        if (!formData.institutionDeclaration) {
          alert('Please confirm the institution declaration');
          setIsSubmitting(false);
          return;
        }
      } else if (registrationType === 'moba-open') {
        // Check all team members have Aadhaar
        for (let i = 0; i < teamMembersWithDocs.length; i++) {
          if (!teamMembersWithDocs[i].aadhaarUpload) {
            alert(`Please upload Aadhaar for Player ${i + 1}`);
            setIsSubmitting(false);
            return;
          }
        }
        // Check substitute has Aadhaar if any substitute details are filled
        if (formData.substitute.fullName || formData.substitute.ign) {
          if (!formData.substitute.aadhaarUpload) {
            alert('Please upload Aadhaar for Substitute Player');
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!formData.livestreamConsent) {
        alert('Please provide consent for livestream and photography');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (registrationType === 'college') {
        await submitTeamRegistration({
          teamName: formData.teamName,
          collegeName: formData.collegeName,
          captainName: formData.captainName,
          captainEmail: formData.captainEmail,
          captainPhone: formData.captainPhone,
          gameId: formData.game,
          teamCategory: formData.category,
          registrationType,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          teamMembers: formData.teamMembers,
          substitute: formData.substitute,
          termsAccepted: formData.agreeTerms,
          studentIdUpload: formData.studentIdUpload,
          institutionDeclaration: formData.institutionDeclaration,
          livestreamConsent: formData.livestreamConsent,
          coordinatorName: formData.coordinatorName,
          coordinatorPhone: formData.coordinatorPhone
        });
      } else if (registrationType === 'moba-open') {
        await submitTeamRegistration({
          teamName: formData.teamName,
          collegeName: formData.collegeName,
          captainName: formData.captainName,
          captainEmail: formData.captainEmail,
          captainPhone: formData.captainPhone,
          gameId: formData.game,
          teamCategory: 'open',
          registrationType: 'open_category',
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          teamMembers: formData.teamMembers,
          substitute: formData.substitute,
          termsAccepted: formData.agreeTerms,
          aadhaarUpload: formData.aadhaarUpload,
          livestreamConsent: formData.livestreamConsent
        });
      } else if (registrationType === 'cosplayer') {
        // Use visitor registration for cosplayers with custom success message
        await submitVisitorRegistration({
          fullName: formData.captainName,
          email: formData.captainEmail,
          phone: formData.captainPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          registrationId: registrationId
        }, 'Cosplayer registration submitted successfully!');
      } else if (registrationType === 'vendor') {
        // Use sponsor registration for vendors with custom success message
        await submitSponsorRegistration({
          companyName: formData.collegeName,
          sponsorshipTierId: '1', // Default tier for vendors
          contactPerson: formData.captainName,
          contactEmail: formData.captainEmail,
          contactPhone: formData.captainPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          message: `Vendor Type: ${formData.category}\n\n${formData.message}`, // Include vendor type in message
          registrationId: registrationId
        }, 'Vendor registration submitted successfully!');
      } else if (registrationType === 'exhibitor') {
        // Use sponsor registration for exhibitors with custom success message
        await submitSponsorRegistration({
          companyName: formData.collegeName,
          sponsorshipTierId: '2', // Default tier for exhibitors
          contactPerson: formData.captainName,
          contactEmail: formData.captainEmail,
          contactPhone: formData.captainPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          message: `Exhibition Description: ${formData.message}\n\nBooth/Space Requirements: ${formData.teamName}`, // Include both fields
          registrationId: registrationId
        }, 'Exhibitor registration submitted successfully!');
      } else if (registrationType === 'media') {
        await submitMediaRegistration({
          fullName: formData.captainName,
          email: formData.captainEmail,
          phone: formData.captainPhone,
          organization: formData.collegeName,
          role: formData.message,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode
        });
      } else if (registrationType === 'sponsor') {
        await submitSponsorRegistration({
          companyName: formData.teamName,
          sponsorshipTierId: formData.sponsorType,
          contactPerson: formData.captainName,
          contactEmail: formData.captainEmail,
          contactPhone: formData.captainPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          message: formData.message
        });
      } else if (registrationType === 'mini-tournament') {
        // Handle passport photo upload and store in Firebase Storage
        let passportPhotoData = null;
        if (formData.passportPhoto) {
          try {
            console.log('Attempting to upload passport photo to Firebase Storage...');
            passportPhotoData = await firebaseStorageService.uploadPassportPhoto(
              formData.passportPhoto,
              registrationId
            );
            console.log('Passport photo uploaded to Firebase Storage:', passportPhotoData);
          } catch (error) {
            console.error('Error uploading passport photo to Firebase Storage:', error);
            console.log('This might be due to Firebase Storage security rules or CORS issues.');
            console.log('Registration will continue without photo upload for now.');
            
            // For now, store a placeholder to indicate photo was attempted
            // In production, you'd want to handle this more gracefully
            passportPhotoData = {
              url: '',
              fileName: `${registrationId}_passport_photo.jpg`,
              uploadedAt: new Date(),
              error: 'Upload failed - likely due to Firebase Storage rules'
            };
          }
        }

        // Submit visitor registration with all mini-tournament details
        await submitVisitorRegistration({
          fullName: formData.captainName,
          email: formData.captainEmail,
          phone: formData.whatsappPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          registrationId: registrationId,
          // Store nickname in collegeName field so dashboard can display it
          collegeName: formData.nickName || 'N/A',
          message: `Game: ${formData.game}\nPhone Call: ${formData.phoneCallNumber || 'N/A'}\nAge: ${formData.age || 'N/A'}\nGender: ${formData.gender || 'N/A'}\n${passportPhotoData ? `Passport Photo: ${passportPhotoData.url || 'Failed to upload'}` : ''}`
        }, 'Mini tournament registration submitted successfully!');

        console.log('Mini tournament registration completed');
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally { 
      setIsSubmitting(false);
    }
  };

  const renderRegistrationForm = () => {
    if (!registrationType) return null;

    const forms = {
      college: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.USERS} size={20} color="#00ff88" />
              Inter-College Nagaland Tournament Registration
            </CardTitle>
            {registrationId && (
              <p className="hidden text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <RegistrationLimitDisplay
              limit={registrationLimit}
              isLoading={isCheckingLimit}
              type="college"
            />
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => handleInputChange("teamName", e.target.value)}
                    placeholder="Enter your team name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="collegeName">College Name *</Label>
                  <Input
                    id="collegeName"
                    value={formData.collegeName}
                    onChange={(e) => handleInputChange("collegeName", e.target.value)}
                    placeholder="Enter your college name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Team Captain Name *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Captain's full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainEmail">Captain Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="captain@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="captainPhone">Captain Phone *</Label>
                <Input
                  id="captainPhone"
                  value={formData.captainPhone}
                  onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Region *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State/Region"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pinCode">PIN Code *</Label>
                <Input
                  id="pinCode"
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange("pinCode", e.target.value)}
                  placeholder="PIN/Zip Code"
                  required
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Tournament Game: Mobile Legends</h4>
                <p className="text-sm text-muted-foreground">
                  College registration is exclusively for Mobile Legends: Bang Bang tournament with 5 players per team.
                </p>
              </div>

              {/* Team Members Section */}
              {registrationType === 'college' && (
                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    Team Members (5 Players Required)
                  </Label>
                  <div className="space-y-4">
                    {getTeamMemberFields().map((member, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-card">
                        <div>
                          <Label htmlFor={`member-${index}-fullName`}>Player {index + 1} Full Name *</Label>
                          <Input
                            id={`member-${index}-fullName`}
                            value={member.fullName}
                            onChange={(e) => handleTeamMemberChange(index, 'fullName', e.target.value)}
                            placeholder="Full name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`member-${index}-ign`}>Player {index + 1} IGN *</Label>
                          <Input
                            id={`member-${index}-ign`}
                            value={member.ign}
                            onChange={(e) => handleTeamMemberChange(index, 'ign', e.target.value)}
                            placeholder="In-game name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`member-${index}-gameId`}>Game ID *</Label>
                          <Input
                            id={`member-${index}-gameId`}
                            value={member.gameId}
                            onChange={(e) => handleTeamMemberChange(index, 'gameId', e.target.value)}
                            placeholder="Game-specific ID"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`member-${index}-studentId`}>Player {index + 1} Student ID *</Label>
                          <Input
                            id={`member-${index}-studentId`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleTeamMemberChange(index, 'studentIdUpload', e.target.files?.[0] || null)}
                            className="mt-1"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload student ID card or bonafide certificate
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-base font-semibold mb-4 block">Substitute Player (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-card">
                  <div>
                    <Label htmlFor="sub-fullName">Substitute Full Name</Label>
                    <Input
                      id="sub-fullName"
                      value={formData.substitute.fullName}
                      onChange={(e) => handleSubstituteChange('fullName', e.target.value)}
                      placeholder="Substitute full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-ign">Substitute IGN</Label>
                    <Input
                      id="sub-ign"
                      value={formData.substitute.ign}
                      onChange={(e) => handleSubstituteChange('ign', e.target.value)}
                      placeholder="Substitute player IGN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-gameId">Game ID</Label>
                    <Input
                      id="sub-gameId"
                      value={formData.substitute.gameId}
                      onChange={(e) => handleSubstituteChange('gameId', e.target.value)}
                      placeholder="Substitute game ID"
                    />
                  </div>
                  {registrationType === 'college' && (
                    <div>
                      <Label htmlFor="sub-studentId">Substitute Student ID</Label>
                      <Input
                        id="sub-studentId"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleSubstituteChange('studentIdUpload', e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Required if substitute details are provided
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Declarations and Consent */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="institutionDeclaration"
                    checked={formData.institutionDeclaration}
                    onChange={(e) => handleInputChange("institutionDeclaration", e.target.checked)}
                    required
                    className="w-5 h-5 mt-0.5"
                  />
                  <div>
                    <Label htmlFor="institutionDeclaration" className="text-sm font-medium">
                      Declaration that all players belong to the same institution *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      I declare that all registered players belong to the same institution unless otherwise permitted by the organizers
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="livestreamConsent"
                    checked={formData.livestreamConsent}
                    onChange={(e) => handleInputChange("livestreamConsent", e.target.checked)}
                    required
                    className="w-5 h-5 mt-0.5"
                  />
                  <div>
                    <Label htmlFor="livestreamConsent" className="text-sm font-medium">
                      Consent for livestream, photography, and recording *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      I consent to photographs, videos, and livestreaming of tournament participation for promotional purposes
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="coordinatorName">Institutional Coordinator Name (Optional)</Label>
                    <Input
                      id="coordinatorName"
                      value={formData.coordinatorName}
                      onChange={(e) => handleInputChange("coordinatorName", e.target.value)}
                      placeholder="Faculty coordinator or institutional representative name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coordinatorPhone">Institutional Coordinator Phone (Optional)</Label>
                    <Input
                      id="coordinatorPhone"
                      value={formData.coordinatorPhone}
                      onChange={(e) => handleInputChange("coordinatorPhone", e.target.value)}
                      placeholder="Coordinator phone number"
                    />
                  </div>
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="college"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting || registrationLimit?.isFull}>
                {registrationLimit?.isFull ? 'Registration Full' : isSubmitting ? 'Submitting...' : 'Submit College Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      'moba-open': (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.TROPHY} size={20} color="#ff6b6b" />
              MOBA 5v5 Open Tournament Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <RegistrationLimitDisplay
              limit={registrationLimit}
              isLoading={isCheckingLimit}
              type="moba-open"
            />
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => handleInputChange("teamName", e.target.value)}
                    placeholder="Enter your team name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="collegeName">Organization/Team Name *</Label>
                  <Input
                    id="collegeName"
                    value={formData.collegeName}
                    onChange={(e) => handleInputChange("collegeName", e.target.value)}
                    placeholder="Enter your organization or team name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Team Captain Name *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Captain's full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainEmail">Captain Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="captain@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="captainPhone">Captain Phone *</Label>
                <Input
                  id="captainPhone"
                  value={formData.captainPhone}
                  onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Region *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State/Region"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pinCode">PIN Code *</Label>
                <Input
                  id="pinCode"
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange("pinCode", e.target.value)}
                  placeholder="PIN/Zip Code"
                  required
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Tournament Game: Mobile Legends</h4>
                <p className="text-sm text-muted-foreground">
                  Open tournament for Mobile Legends: Bang Bang with 5 players per team. Open to all participants.
                </p>
              </div>

              {/* Team Members Section */}
              <div>
                <Label className="text-base font-semibold mb-4 block">
                  Team Members (5 Players Required)
                </Label>
                <div className="space-y-4">
                  {getTeamMemberFields().map((member, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-card">
                      <div>
                        <Label htmlFor={`member-${index}-fullName`}>Player {index + 1} Full Name *</Label>
                        <Input
                          id={`member-${index}-fullName`}
                          value={member.fullName}
                          onChange={(e) => handleTeamMemberChange(index, 'fullName', e.target.value)}
                          placeholder="Full name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`member-${index}-ign`}>Player {index + 1} IGN *</Label>
                        <Input
                          id={`member-${index}-ign`}
                          value={member.ign}
                          onChange={(e) => handleTeamMemberChange(index, 'ign', e.target.value)}
                          placeholder="In-game name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`member-${index}-gameId`}>Game ID *</Label>
                        <Input
                          id={`member-${index}-gameId`}
                          value={member.gameId}
                          onChange={(e) => handleTeamMemberChange(index, 'gameId', e.target.value)}
                          placeholder="Game-specific ID"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`member-${index}-aadhaar`}>Player {index + 1} Aadhaar *</Label>
                        <Input
                          id={`member-${index}-aadhaar`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleTeamMemberChange(index, 'aadhaarUpload', e.target.files?.[0] || null)}
                          className="mt-1"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload Aadhaar card
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-4 block">Substitute Player (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-card">
                  <div>
                    <Label htmlFor="sub-fullName">Substitute Full Name</Label>
                    <Input
                      id="sub-fullName"
                      value={formData.substitute.fullName}
                      onChange={(e) => handleSubstituteChange('fullName', e.target.value)}
                      placeholder="Substitute full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-ign">Substitute IGN</Label>
                    <Input
                      id="sub-ign"
                      value={formData.substitute.ign}
                      onChange={(e) => handleSubstituteChange('ign', e.target.value)}
                      placeholder="Substitute player IGN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-gameId">Game ID</Label>
                    <Input
                      id="sub-gameId"
                      value={formData.substitute.gameId}
                      onChange={(e) => handleSubstituteChange('gameId', e.target.value)}
                      placeholder="Substitute game ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-aadhaar">Substitute Aadhaar</Label>
                    <Input
                      id="sub-aadhaar"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleSubstituteChange('aadhaarUpload', e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required if substitute details are provided
                    </p>
                  </div>
                </div>
              </div>

              {/* Consent Section */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="livestreamConsent"
                    checked={formData.livestreamConsent}
                    onChange={(e) => handleInputChange("livestreamConsent", e.target.checked)}
                    required
                    className="w-5 h-5 mt-0.5"
                  />
                  <div>
                    <Label htmlFor="livestreamConsent" className="text-sm font-medium">
                      Consent for livestream, photography, and recording *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      I consent to photographs, videos, and livestreaming of tournament participation for promotional purposes
                    </p>
                  </div>
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="moba-open"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting || registrationLimit?.isFull}>
                {registrationLimit?.isFull ? 'Registration Full' : isSubmitting ? 'Submitting...' : 'Submit MOBA Tournament Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      cosplayer: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.STAR} size={20} color="#ec4899" />
              Cosplayer Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="captainName">Full Name *</Label>
                <Input
                  id="captainName"
                  value={formData.captainName}
                  onChange={(e) => handleInputChange("captainName", e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainEmail">Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="Your email address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainPhone">Phone *</Label>
                  <Input
                    id="captainPhone"
                    value={formData.captainPhone}
                    onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                    placeholder="Your phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="collegeName">Cosplay Group/Team Name</Label>
                <Input
                  id="collegeName"
                  value={formData.collegeName}
                  onChange={(e) => handleInputChange("collegeName", e.target.value)}
                  placeholder="Your cosplay group or team name (if any)"
                />
              </div>

              <div>
                <Label htmlFor="message">Cosplay Experience</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Tell us about your cosplay experience and characters you've portrayed"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange("pinCode", e.target.value)}
                    placeholder="PIN Code"
                    required
                  />
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="cosplayer"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Register as Cosplayer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      vendor: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.TARGET} size={20} color="#3b82f6" />
              Vendor Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="collegeName">Company/Business Name *</Label>
                <Input
                  id="collegeName"
                  value={formData.collegeName}
                  onChange={(e) => handleInputChange("collegeName", e.target.value)}
                  placeholder="Your company or business name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="vendorType">Vendor Type *</Label>
                <select
                  id="vendorType"
                  value={formData.category || ''}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select vendor type</option>
                  <option value="food">Food</option>
                  <option value="beverage">Beverage</option>
                  <option value="merchandise">Merchandise (Toys, Clothes, Footwears etc)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="message">Products/Services Description *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Describe the products or services you'll be offering"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Contact Person *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainEmail">Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="Contact email address"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="captainPhone">Phone *</Label>
                <Input
                  id="captainPhone"
                  value={formData.captainPhone}
                  onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                  placeholder="Contact phone number"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Business Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete business address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange("pinCode", e.target.value)}
                    placeholder="PIN Code"
                    required
                  />
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="vendor"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Register as Vendor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      exhibitor: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.MONITOR} size={20} color="#eab308" />
              Exhibitor Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="collegeName">Company/Organization Name *</Label>
                <Input
                  id="collegeName"
                  value={formData.collegeName}
                  onChange={(e) => handleInputChange("collegeName", e.target.value)}
                  placeholder="Your company or organization name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Exhibition Description *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Describe what you'll be exhibiting or demonstrating"
                  required
                />
              </div>

              <div>
                <Label htmlFor="teamName">Booth/Space Requirements</Label>
                <Textarea
                  id="teamName"
                  value={formData.teamName}
                  onChange={(e) => handleInputChange("teamName", e.target.value)}
                  placeholder="Describe your booth/space requirements (size, equipment, etc.)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Contact Person *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainEmail">Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="Contact email address"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="captainPhone">Phone *</Label>
                <Input
                  id="captainPhone"
                  value={formData.captainPhone}
                  onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                  placeholder="Contact phone number"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Organization Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete organization address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange("pinCode", e.target.value)}
                    placeholder="PIN Code"
                    required
                  />
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="exhibitor"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Register as Exhibitor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      media: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.VIDEO} size={20} color="#a855f7" />
              Media Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="captainName">Full Name *</Label>
                <Input
                  id="captainName"
                  value={formData.captainName}
                  onChange={(e) => handleInputChange("captainName", e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainEmail">Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="Your email address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainPhone">Phone *</Label>
                  <Input
                    id="captainPhone"
                    value={formData.captainPhone}
                    onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                    placeholder="Your phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="collegeName">Media Organization *</Label>
                <Input
                  id="collegeName"
                  value={formData.collegeName}
                  onChange={(e) => handleInputChange("collegeName", e.target.value)}
                  placeholder="Your media organization"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Role/Position *</Label>
                <Input
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Your role (Journalist, Photographer, Content Creator, etc.)"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange("pinCode", e.target.value)}
                    placeholder="PIN Code"
                    required
                  />
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="media"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Register as Media"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      sponsor: (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.PARTNERSHIP} size={20} color="#50D075" />
              Sponsor Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="teamName">Company Name *</Label>
                <Input
                  id="teamName"
                  value={formData.teamName}
                  onChange={(e) => handleInputChange("teamName", e.target.value)}
                  placeholder="Your company name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="sponsorType">Sponsorship Tier *</Label>
                <select
                  id="sponsorType"
                  value={formData.sponsorType}
                  onChange={(e) => handleInputChange("sponsorType", e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select sponsorship tier</option>
                  <option value="1">🏆 TITLE SPONSOR</option>
                  <option value="2">🥈 POWERED BY SPONSOR</option>
                  <option value="3">🥉 ASSOCIATE SPONSOR</option>
                  <option value="4">🎮 CATEGORY PARTNERS</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Contact Person *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="captainEmail">Email *</Label>
                  <Input
                    id="captainEmail"
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                    placeholder="Contact email address"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="captainPhone">Phone *</Label>
                <Input
                  id="captainPhone"
                  value={formData.captainPhone}
                  onChange={(e) => handleInputChange("captainPhone", e.target.value)}
                  placeholder="Contact phone number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Additional Information</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Any additional information or special requirements"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Company Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete company address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange("pinCode", e.target.value)}
                    placeholder="PIN Code"
                    required
                  />
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="sponsor"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Register as Sponsor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ),

      'mini-tournament': (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GamingIcon iconId={GamingIcons.GAMEPAD} size={20} color="#ff6b6b" />
              Mini Tournament Registration
            </CardTitle>
            {registrationId && (
              <p className="text-sm text-muted-foreground">Registration ID: {registrationId}</p>
            )}
          </CardHeader>
          <CardContent>
            <RegistrationLimitDisplay
              limit={registrationLimit}
              isLoading={isCheckingLimit}
              type="mini-tournament"
            />
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Game Selection */}
              <div>
                <Label htmlFor="miniGame">Select Tournament *</Label>
                <select
                  id="miniGame"
                  value={formData.game || ''}
                  onChange={(e) => handleInputChange("game", e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a mini tournament</option>
                  {miniTournaments.map((tournament, index) => (
                    <option key={index} value={tournament.name}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="captainName">Full Name *</Label>
                  <Input
                    id="captainName"
                    value={formData.captainName}
                    onChange={(e) => handleInputChange("captainName", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nickName">Nick Name (for tournament overlay) *</Label>
                  <Input
                    id="nickName"
                    value={formData.nickName}
                    onChange={(e) => handleInputChange("nickName", e.target.value)}
                    placeholder="Your gaming nickname"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="captainEmail">Email Address *</Label>
                <Input
                  id="captainEmail"
                  type="email"
                  value={formData.captainEmail}
                  onChange={(e) => handleInputChange("captainEmail", e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whatsappPhone">WhatsApp Phone Number *</Label>
                  <Input
                    id="whatsappPhone"
                    value={formData.whatsappPhone}
                    onChange={(e) => handleInputChange("whatsappPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneCallNumber">Phone Call Number *</Label>
                  <Input
                    id="phoneCallNumber"
                    value={formData.phoneCallNumber}
                    onChange={(e) => handleInputChange("phoneCallNumber", e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="Your age"
                    min="12"
                    max="60"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    value={formData.gender || ''}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Passport Photo Upload */}
              <div>
                <Label htmlFor="passportPhoto">Passport Photo (White Background Only) *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="passportPhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, passportPhoto: file }));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    className="w-full max-w-xs h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => document.getElementById('passportPhoto')?.click()}
                  >
                    {formData.passportPhoto ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={URL.createObjectURL(formData.passportPhoto)} 
                          alt="Passport photo preview" 
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <GamingIcon iconId={GamingIcons.CAMERA} size={24} color="#9ca3af" />
                        <p className="text-sm text-gray-500 mt-2">Click to upload passport photo</p>
                        <p className="text-xs text-gray-400">White background only</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <TermsAndConditions 
                accepted={formData.agreeTerms}
                onAccept={(accepted) => handleInputChange("agreeTerms", accepted)}
                registrationType="mini-tournament"
              />

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isSubmitting || registrationLimit?.isFull}>
                {registrationLimit?.isFull ? 'Registration Full' : isSubmitting ? 'Submitting...' : 'Register for Mini Tournament'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )
    };

    return forms[registrationType as keyof typeof forms];
  };

  if (registrationType) {
    return (
      <section id="register" className="py-20 md:py-28" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Button
              variant="outline"
              onClick={() => setRegistrationType(null)}
              className="mb-4"
            >
              ← Back to Registration Options
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {renderRegistrationForm()}
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="py-20" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* <h2 className="font-['Neiko'] text-4xl md:text-6xl font-bold mb-4">
            Register for <span className="text-5xl md:text-[64px]" style={{ fontFamily: "'Neo_Triad', sans-serif", color: "#00ff88" }}>TXG</span> 
          </h2> */}
          <h2 className="font-['Neiko'] text-4xl md:text-6xl font-bold text-white mb-6">
            Register for{" "}
            <span 
              className="font-['Neo_Triad'] inline-flex tracking-normal" 
              style={{ fontFamily: "'Neo_Triad', sans-serif" }}
            >
              {/* Red 'T' with minimal vertical gradient */}
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#FF5F4F] via-[#EA4335] to-[#FF00FF]"
              >
                T
              </span>
              {/* Green 'X' with minimal vertical gradient */}
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#50D075] via-[#34A853] to-[#FFFF00]">
                X
              </span>
              {/* Blue 'G' with minimal vertical gradient */}
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#50D075] via-[#FFFF00] to-[#50D075]">
                G
              </span>
            </span>
          </h2>
          <p className="text-[#d0d0d0] text-lg max-w-2xl mx-auto font-['Nonito']">
            Join Southeast Asia's premier gaming event. Choose your registration type below.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 * 0.15 }}
            // onClick={() => setRegistrationType("college")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.USERS} size={24} color="#00ff88" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Inter College</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Register your college team for Mobile Legends tournament
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setRegistrationType("moba-open")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.TROPHY} size={24} color="#ff6b6b" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">MOBA 5v5 Open</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Open tournament for Mobile Legends 5v5 competition
              </p>
            </div>
            <Button className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            // onClick={() => setRegistrationType("mini-tournament")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.GAMEPAD} size={24} color="#ff6b6b" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Mini Tournaments</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Register for quick action games and instant rewards
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            // onClick={() => setRegistrationType("cosplayer")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.STAR} size={24} color="#ec4899" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Cosplayers</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Register as a cosplayer and showcase your talent
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            // onClick={() => setRegistrationType("vendor")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.TARGET} size={24} color="#3b82f6" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Vendors</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Sell your products and services at the event
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            // onClick={() => setRegistrationType("exhibitor")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.MONITOR} size={24} color="#eab308" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Exhibitor</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Exhibit your products and connect with attendees
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register Now</Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            // onClick={() => setRegistrationType("media")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.VIDEO} size={24} color="#a855f7" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Media</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Press access for journalists, photographers, and content creators
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Register as Media</Button>
          </motion.div>

          <motion.div 
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center hover:shadow-xl transition-all group cursor-pointer h-full flex flex-col"
            data-registration-type="sponsor"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            // onClick={() => setRegistrationType("sponsor")}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
              <GamingIcon iconId={GamingIcons.PARTNERSHIP} size={24} color="#50D075" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
              <h3 className="font-['Neiko'] text-lg sm:text-xl font-bold text-white mb-3">Sponsors</h3>
              <p className="text-[#d0d0d0] text-xs sm:text-sm leading-relaxed mb-4 font-['Nonito']">
                Partner with us and showcase your brand
              </p>
            </div>
            <Button disabled className="w-full text-sm sm:text-base" variant="outline">Become Partner</Button>
          </motion.div>
        </div>

        {/* Become a Partner Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-2 text-[#d0d0d0] hover:text-white transition-colors cursor-pointer group"
               onClick={() => {
                 setRegistrationType("sponsor");
                 // Scroll to sponsor card after it renders
                 setTimeout(() => {
                   // Try multiple selectors to find the sponsor card
                   let element = document.querySelector('[data-registration-type="sponsor"]');
                   if (!element) {
                     // Fallback: look for any card with sponsor text
                     element = Array.from(document.querySelectorAll('.motion-div')).find(el => 
                       el.textContent?.includes('Sponsor') || el.textContent?.includes('Partner')
                     );
                   }
                   if (element) {
                     element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   }
                 }, 500);
               }}>
            <span className="text-lg font-['Nonito']">Interested in partnership opportunities?</span>
            <span className="text-[#50D075] group-hover:text-[#00ff88] font-semibold transition-colors">
              Become a Partner →
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RegistrationSection;
