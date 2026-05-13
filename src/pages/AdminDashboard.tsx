import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Calendar, Gamepad2, Search, RefreshCw, FileText, Settings, Download, Eye } from 'lucide-react';
import GamingIcon, { GamingIcons } from "@/components/GamingIcons";
import { useRegistrationAPI } from '@/hooks/useRegistrationAPI';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { TeamRegistration, SponsorRegistration, MediaPersonRegistration } from '@/lib/firebase';
import { sendApprovalEmail, getApprovalEmailContent } from '@/utils/firebaseEmailService';
import EmailTestComponent from '@/components/EmailTestComponent';
import ManualDataEntry from '@/components/ManualDataEntry';
import ContentManagement from '@/components/ContentManagement';
import firebaseStorageService from '@/services/firebaseStorageService';

// Helper function to format dates in day/month/year format
const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to get mini tournament game name from registration message
const getMiniTournamentGame = (registration: any): string => {
  if (!registration.message) return 'Unknown';
  const gameMatch = registration.message.match(/Game:\s*([^\n]+)/);
  return gameMatch ? gameMatch[1].trim() : 'Unknown';
};

// Separate component for passport photo to properly use hooks
const PassportPhotoDisplay = ({ registrationId }: { registrationId: string }) => {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const url = await firebaseStorageService.getPassportPhotoURL(registrationId);
        setPhotoURL(url);
      } catch (error) {
        console.error('Error fetching passport photo:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [registrationId]);
  
  if (loading) {
    return <span className="text-gray-500 text-sm">Loading...</span>;
  }
  
  if (!photoURL) {
    return <span className="text-gray-500 text-sm">No photo available</span>;
  }
  
  return (
    <div className="space-y-2">
      <img 
        src={photoURL} 
        alt="Passport Photo"
        className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => window.open(photoURL, '_blank')}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 px-2 w-full"
        onClick={async () => {
          if (photoURL) {
            await firebaseStorageService.downloadFile(photoURL, `${registrationId}_passport_photo.jpg`);
          } else {
            alert('Passport photo not found');
          }
        }}
      >
        <Download className="w-3 h-3 mr-1" />
        Download
      </Button>
    </div>
  );
};

const AdminDashboard = () => {
  const { adminUser, logout } = useAdminAuth();
  const { 
    loading, 
    getGames,
    getColleges,
    getSponsorshipTiers,
    getDashboardStats,
    getAllTeamRegistrations,
    getAllSponsorRegistrations,
    getAllVisitorRegistrations,
    getAllMediaRegistrations,
    updateTeamStatus,
    updateSponsorStatus,
    updateVisitorStatus,
    updateMediaStatus,
    deleteTeamRegistration,
    deleteSponsorRegistration,
    deleteMediaRegistration
  } = useRegistrationAPI();

  const [stats, setStats] = useState<any>(null);
  const [teamRegistrations, setTeamRegistrations] = useState<TeamRegistration[]>([]);
  const [sponsorRegistrations, setSponsorRegistrations] = useState<SponsorRegistration[]>([]);
  const [mediaRegistrations, setMediaRegistrations] = useState<MediaPersonRegistration[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [sponsorshipTiers, setSponsorshipTiers] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Advanced filters for each registration type
  const [teamFilters, setTeamFilters] = useState({
    game: '',
    college: '',
    status: 'all',
    dateRange: 'all'
  });
  
  const [sponsorFilters, setSponsorFilters] = useState({
    tier: '',
    status: 'all',
    dateRange: 'all'
  });
  
  const [mediaFilters, setMediaFilters] = useState({
    status: 'all',
    dateRange: 'all'
  });

  // Filtered registrations for different types
  const [cosplayerRegistrations, setCosplayerRegistrations] = useState<any[]>([]);
  const [vendorRegistrations, setVendorRegistrations] = useState<SponsorRegistration[]>([]);
  const [exhibitorRegistrations, setExhibitorRegistrations] = useState<SponsorRegistration[]>([]);
  const [visitorRegistrations, setVisitorRegistrations] = useState<any[]>([]);
  const [miniTournamentRegistrations, setMiniTournamentRegistrations] = useState<any[]>([]);
  const [mobaOpenRegistrations, setMobaOpenRegistrations] = useState<TeamRegistration[]>([]);

  // Mini Tournament Games List
  const miniTournamentGames = [
    'Clash Royale',
    'Street Fighter 6',
    'Dragon Ball Fighter Z',
    'FC 26',
    'Guilty Gear Strive',
    'King Of Fighters XV',
    'Mortal Kombat 1',
    'Ludo',
    'NBA 2K26',
    'Dirt Rally 2.0',
    'Tekken 8',
    'Tetris'
  ];

  // State for selected mini game tab
  const [selectedMiniGame, setSelectedMiniGame] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const [statsData, teams, sponsors, visitors, media, gamesData, sponsorshipTiersData] = await Promise.all([
        getDashboardStats(),
        getAllTeamRegistrations(),
        getAllSponsorRegistrations(),
        getAllVisitorRegistrations(),
        getAllMediaRegistrations(),
        getGames(),
        getSponsorshipTiers()
      ]);

      setStats(statsData);
      setTeamRegistrations(teams || []);
      setSponsorRegistrations(sponsors || []);
      setVisitorRegistrations(visitors || []);
      setMediaRegistrations(media || []);
      setGames(gamesData || []);
      setSponsorshipTiers(sponsorshipTiersData || []);

      // Filter registrations by type
      // Cosplayers: Visitor registrations with COS prefix in registrationId
      const cosplayers = (visitors || []).filter(v => v.registrationId && v.registrationId.startsWith('COS'));
      setCosplayerRegistrations(cosplayers);

      // Vendors: Sponsor registrations with VEN prefix in registrationId or "Vendor Type:" in message
      const vendors = (sponsors || []).filter(s => 
        (s.registrationId && s.registrationId.startsWith('VEN')) || 
        (s.message && s.message.includes('Vendor Type:'))
      );
      setVendorRegistrations(vendors);

      // Exhibitors: Sponsor registrations with EXH prefix in registrationId
      const exhibitors = (sponsors || []).filter(s => s.registrationId && s.registrationId.startsWith('EXH'));
      setExhibitorRegistrations(exhibitors);

      // Mini Tournaments: Visitor registrations with MIN prefix in registrationId or "Game:" in message
      const miniTournaments = (visitors || []).filter(v => 
        (v.registrationId && v.registrationId.startsWith('MIN')) || 
        (v.message && v.message.includes('Game:'))
      );
      setMiniTournamentRegistrations(miniTournaments);

      // MOBA 5v5 Open Tournament: Team registrations with MOB prefix in registrationId or teamCategory 'open'
      const mobaOpen = (teams || []).filter(t => 
        (t.registrationId && t.registrationId.startsWith('MOB')) || 
        (t.teamCategory === 'open')
      );
      setMobaOpenRegistrations(mobaOpen);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const getGameName = (gameId: string) => {
    
    // Handle null/undefined/empty cases
    if (!gameId || gameId === '' || gameId === 'undefined' || gameId === 'null') {
      return 'Unknown Game';
    }
    
    // Ensure gameId is a string - most robust conversion
    let gameIdStr = '';
    
    try {
      if (gameId === null || gameId === undefined) {
        gameIdStr = '';
      } else if (typeof gameId === 'string') {
        gameIdStr = gameId;
      } else if (typeof gameId === 'number') {
        gameIdStr = (gameId as any).toString();
      } else if (typeof gameId === 'object') {
        // Handle different object structures
        if ((gameId as any).id) {
          gameIdStr = String((gameId as any).id);
        } else if ((gameId as any).gameId) {
          gameIdStr = String((gameId as any).gameId);
        } else {
          // Last resort - convert entire object to string and extract potential ID
          const objStr = JSON.stringify(gameId);
          // Try to extract ID from JSON string
          const idMatch = objStr.match(/"id":\s*"([^"]+)"/);
          if (idMatch && idMatch[1]) {
            gameIdStr = idMatch[1];
          } else {
            // Try to extract any string that looks like an ID
            const anyStringMatch = objStr.match(/"([^"]{4,})"/);
            if (anyStringMatch && anyStringMatch[1]) {
              gameIdStr = anyStringMatch[1];
            } else {
              gameIdStr = objStr; // Fallback to full JSON string
            }
          }
        }
      } else {
        gameIdStr = String(gameId);
      }
    } catch (error) {
      gameIdStr = String(gameId);
    }
    
    // Try to find in Firebase games first
    if (games.length > 0) {
      const foundGame = games.find(g => g.id === gameIdStr);
      if (foundGame) {
        return foundGame.name;
      }
    }
    
    // Direct fallback mapping for known problematic IDs
    const directMap: { [key: string]: string } = {
      '34t2nogh': 'BGMI',
      '123450': 'BGMI',
      '123451': 'Mobile Legends',
      '123452': 'BGMI',
      'nkf9ZYPZH9YQQ2MkBciB': 'BGMI',
      'T55Ke4o48q7zaOfw3SMj': 'Mobile Legends'
    };
    
    // Check direct mapping first
    if (directMap[gameIdStr]) {
      return directMap[gameIdStr];
    }
    
    // Pattern matching
    if (gameIdStr.includes('bgmi') || gameIdStr.includes('450') || gameIdStr.includes('nkf9')) {
      return 'BGMI';
    }
    if (gameIdStr.includes('mobile') || gameIdStr.includes('legends') || gameIdStr.includes('451') || gameIdStr.includes('T55Ke')) {
      return 'Mobile Legends';
    }
    
    return 'Unknown Game';
  };

  const getSponsorshipTierName = (tierId: string) => {
    // Handle null/undefined/empty cases
    if (!tierId || tierId === '' || tierId === 'undefined' || tierId === 'null') {
      return 'Unknown Tier';
    }
    
    // First try to find in loaded tiers
    const tier = sponsorshipTiers.find(t => t.id === tierId);
    if (tier && tier.name) {
      return tier.name;
    }
    
    // Fallback mapping for common tier IDs
    const tierMap: { [key: string]: string } = {
      '1': '🏆 TITLE SPONSOR',
      '2': '🥈 POWERED BY SPONSOR',
      '3': '🥉 ASSOCIATE SPONSOR',
      '4': '🎮 CATEGORY PARTNERS',
      'title': '🏆 TITLE SPONSOR',
      'powered': '🥈 POWERED BY SPONSOR',
      'associate': '🥉 ASSOCIATE SPONSOR',
      'category': '🎮 CATEGORY PARTNERS',
      'gold': '🏆 TITLE SPONSOR',
      'silver': '🥈 POWERED BY SPONSOR',
      'bronze': '🥉 ASSOCIATE SPONSOR',
      'platinum': '🎮 CATEGORY PARTNERS',
      'tier_1': '🏆 TITLE SPONSOR',
      'tier_2': '🥈 POWERED BY SPONSOR',
      'tier_3': '🥉 ASSOCIATE SPONSOR',
      'tier_4': '🎮 CATEGORY PARTNERS'
    };
    
    const fallbackName = tierMap[tierId] || 'Unknown Tier';
    return fallbackName;
  };

  // Status Management Functions
  const handleStatusUpdate = async (id: string, type: 'inter-college' | 'moba-open' | 'sponsor' | 'cosplayer' | 'vendor' | 'exhibitor' | 'media' | 'mini-tournament', status: 'pending' | 'approved' | 'rejected' | 'withdrawn') => {
    let success = false;
    let registrationData: any = null;
    
    try {
      // Get registration data before updating for email
      switch (type) {
        case 'inter-college':
          registrationData = teamRegistrations.find(t => t.id === id);
          success = await updateTeamStatus(id, status);
          break;
        case 'moba-open':
          registrationData = mobaOpenRegistrations.find(t => t.id === id);
          success = await updateTeamStatus(id, status);
          break;
        case 'sponsor':
          registrationData = sponsorRegistrations.find(s => s.id === id);
          success = await updateSponsorStatus(id, status);
          break;
        case 'cosplayer':
          registrationData = cosplayerRegistrations.find(c => c.id === id);
          success = await updateVisitorStatus(id, status);
          break;
        case 'vendor':
          registrationData = vendorRegistrations.find(v => v.id === id);
          success = await updateSponsorStatus(id, status);
          break;
        case 'exhibitor':
          registrationData = exhibitorRegistrations.find(e => e.id === id);
          success = await updateSponsorStatus(id, status);
          break;
        case 'media':
          registrationData = mediaRegistrations.find(m => m.id === id);
          success = await updateMediaStatus(id, status);
          break;
        case 'mini-tournament':
          registrationData = miniTournamentRegistrations.find(m => m.id === id);
          success = await updateVisitorStatus(id, status);
          break;
      }
      
      if (success) {
        // Send email notification for approval/rejection
        if ((status === 'approved' || status === 'rejected') && registrationData) {
          // Create a copy of registration data with the correct registration type
          let finalRegistrationType = type;
          
          // Map admin dashboard types to email service types
          switch (type) {
            case 'inter-college':
              finalRegistrationType = registrationData.registrationType || 'college'; // 'college' or 'open_category'
              break;
            case 'moba-open':
              finalRegistrationType = registrationData.registrationType || 'open_category';
              break;
            case 'sponsor':
              finalRegistrationType = 'sponsor';
              break;
            case 'cosplayer':
              finalRegistrationType = 'cosplayer';
              break;
            case 'vendor':
              finalRegistrationType = 'vendor';
              break;
            case 'exhibitor':
              finalRegistrationType = 'exhibitor';
              break;
            case 'media':
              finalRegistrationType = 'media';
              break;
          }
          
          const registrationDataWithType = {
            ...registrationData,
            registrationType: finalRegistrationType
          };
          
          const emailData = getApprovalEmailContent(registrationDataWithType, status);
          const emailSent = await sendApprovalEmail(emailData);
          if (emailSent) {
            console.log(`Email notification sent for ${status} registration`);
          } else {
            console.error('Failed to send email notification');
          }
        }
        
        // Reload data to reflect changes
        loadDashboardData();
      } else {
        console.error('Status update failed');
      }
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
    }
  };

  // Bulk Delete Functions
  const handleBulkDelete = async (type: 'all' | 'teams' | 'sponsors' | 'cosplayers' | 'vendors' | 'exhibitors' | 'media') => {
    const confirmMessage = {
      all: 'Are you sure you want to PERMANENTLY DELETE ALL registration data? This action cannot be undone and will remove data from the database.',
      teams: 'Are you sure you want to PERMANENTLY DELETE all team registrations? This action cannot be undone and will remove data from the database.',
      sponsors: 'Are you sure you want to PERMANENTLY DELETE all sponsor registrations? This action cannot be undone and will remove data from the database.',
      cosplayers: 'Are you sure you want to PERMANENTLY DELETE all cosplayer registrations? This action cannot be undone and will remove data from the database.',
      vendors: 'Are you sure you want to PERMANENTLY DELETE all vendor registrations? This action cannot be undone and will remove data from the database.',
      exhibitors: 'Are you sure you want to PERMANENTLY DELETE all exhibitor registrations? This action cannot be undone and will remove data from the database.',
      media: 'Are you sure you want to PERMANENTLY DELETE all media registrations? This action cannot be undone and will remove data from the database.'
    };

    if (!window.confirm(confirmMessage[type])) {
      return;
    }

    // Second confirmation for safety
    if (!window.confirm('WARNING: This will PERMANENTLY DELETE the data from the database. This action CANNOT BE UNDONE. Click OK to confirm.')) {
      return;
    }

    try {
      const registrationsToDelete = {
        teams: teamRegistrations,
        sponsors: getPureSponsorRegistrations(),
        cosplayers: cosplayerRegistrations,
        vendors: vendorRegistrations,
        exhibitors: exhibitorRegistrations,
        media: mediaRegistrations
      };

      const targets = type === 'all' 
        ? [...registrationsToDelete.teams, ...registrationsToDelete.sponsors, ...registrationsToDelete.cosplayers, ...registrationsToDelete.vendors, ...registrationsToDelete.exhibitors, ...registrationsToDelete.media]
        : registrationsToDelete[type];

      const deletePromises = targets.map(async (reg) => {
        if ('teamName' in reg) {
          return deleteTeamRegistration(reg.id);
        } else if ('companyName' in reg) {
          return deleteSponsorRegistration(reg.id);
        } else if ('fullName' in reg && 'organization' in reg) {
          return deleteMediaRegistration(reg.id);
        }
      });

      const results = await Promise.all(deletePromises);
      
      alert(`Successfully PERMANENTLY DELETED ${targets.length} registrations from the database.`);
      loadDashboardData();
    } catch (error) {
      console.error('Error in permanent bulk delete:', error);
      alert('Error permanently deleting data. Please try again.');
    }
  };

  // CSV Export Functions
  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    // Convert data to CSV format
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in values
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTeamRegistrationsCSV = () => {
    const headers = [
      'registrationId',
      'teamName', 
      'registrationType',
      'collegeName',
      'teamCategory',
      'captainName',
      'captainEmail', 
      'captainPhone',
      'address',
      'city',
      'state',
      'pinCode',
      'gameId',
      'status',
      'teamMembersCount',
      'teamMembers_IGNs',
      'teamMembers_IDs',
      'substitute_IGN',
      'substitute_ID',
      'hasSubstitute',
      'termsAccepted',
      'createdAt',
      'updatedAt'
    ];

    const csvData = filterTeamRegistrations(teamRegistrations).map(team => {
      // Extract team members IGNs and IDs
      const teamMemberIGNs = team.teamMembers?.map(member => member.ign || '').join('; ') || '';
      const teamMemberIDs = team.teamMembers?.map(member => member.gameId || '').join('; ') || '';
      
      // Extract substitute IGN and ID if available
      const substituteIGN = team.substitute?.ign || '';
      const substituteID = team.substitute?.gameId || '';

      return {
        registrationId: team.registrationId || '',
        teamName: team.teamName || '',
        registrationType: team.registrationType || '',
        collegeName: team.collegeName || '',
        teamCategory: team.teamCategory || '',
        captainName: team.captainName || '',
        captainEmail: team.captainEmail || '',
        captainPhone: team.captainPhone || '',
        address: team.address || '',
        city: team.city || '',
        state: team.state || '',
        pinCode: team.pinCode || '',
        gameId: getGameName(team.gameId || ''),
        status: team.status || '',
        teamMembersCount: team.teamMembers?.length || 0,
        teamMembers_IGNs: teamMemberIGNs,
        teamMembers_IDs: teamMemberIDs,
        substitute_IGN: substituteIGN,
        substitute_ID: substituteID,
        hasSubstitute: team.substitute ? 'Yes' : 'No',
        termsAccepted: team.termsAccepted ? 'Yes' : 'No',
        createdAt: formatDate(team.createdAt),
        updatedAt: formatDate(team.updatedAt)
      };
    });

    downloadCSV(csvData, 'team_registrations', headers);
  };

  const downloadSponsorRegistrationsCSV = () => {
    const headers = [
      'registrationId',
      'companyName',
      'sponsorshipTierId',
      'sponsorshipTierName',
      'sponsoredAmount',
      'contactPerson',
      'contactEmail',
      'contactPhone',
      'address',
      'city',
      'state',
      'pinCode',
      'status',
      'createdAt',
      'updatedAt'
    ];

    const csvData = filterSponsorRegistrations(getPureSponsorRegistrations()).map(sponsor => {
      // Enhanced sponsored amount calculation with tier mapping
      const tier = sponsorshipTiers.find(t => String(t.id) === String(sponsor.sponsorshipTierId || ''));
      let sponsoredAmount = '';
      
      if (!tier) {
        // Map common tier IDs to amounts
        const tierMapping = {
          1: '₹5,00,000+',  // Title Sponsor
          2: '₹2,50,000',  // Powered By Sponsor  
          3: '₹1,00,000',  // Associate Sponsor
          4: 'Custom/In-Kind' // Category Partner
        };
        
        const mappedAmount = tierMapping[Number(sponsor.sponsorshipTierId) as keyof typeof tierMapping];
        sponsoredAmount = mappedAmount || 'Not specified';
      } else {
        sponsoredAmount = `₹${(tier.price || 0).toLocaleString()}`;
      }

      return {
        registrationId: sponsor.registrationId || '',
        companyName: sponsor.companyName || '',
        sponsorshipTierId: sponsor.sponsorshipTierId || '',
        sponsorshipTierName: getSponsorshipTierName(sponsor.sponsorshipTierId || ''),
        sponsoredAmount: sponsoredAmount,
        contactPerson: sponsor.contactPerson || '',
        contactEmail: sponsor.contactEmail || '',
        contactPhone: sponsor.contactPhone || '',
        address: sponsor.address || '',
        city: sponsor.city || '',
        state: sponsor.state || '',
        pinCode: sponsor.pinCode || '',
        status: sponsor.status || '',
        createdAt: formatDate(sponsor.createdAt),
        updatedAt: formatDate(sponsor.updatedAt)
      };
    });

    downloadCSV(csvData, 'sponsor_registrations', headers);
  };

  
  const downloadMediaRegistrationsCSV = () => {
    const headers = [
      'registrationId',
      'fullName',
      'email',
      'phone',
      'organization',
      'role',
      'address',
      'city',
      'state',
      'pinCode',
      'status',
      'createdAt',
      'updatedAt'
    ];

    const csvData = filterMediaRegistrations(mediaRegistrations).map(media => ({
      registrationId: media.registrationId || '',
      fullName: media.fullName || '',
      email: media.email || '',
      phone: media.phone || '',
      organization: media.organization || '',
      role: media.role || '',
      address: media.address || '',
      city: media.city || '',
      state: media.state || '',
      pinCode: media.pinCode || '',
      status: media.status || '',
      createdAt: formatDate(media.createdAt),
      updatedAt: formatDate(media.updatedAt)
    }));

    downloadCSV(csvData, 'media_registrations', headers);
  };

  const downloadCosplayerRegistrationsCSV = () => {
    const headers = [
      'registrationId',
      'fullName',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'pinCode',
      'cosplayGroupTeamName', // Cosplay Group/Team Name
      'cosplayExperience', // Cosplay Experience
      'status',
      'createdAt'
    ];

    const csvData = cosplayerRegistrations.map((cosplayer) => ({
      registrationId: cosplayer.registrationId || '',
      fullName: cosplayer.fullName || '',
      email: cosplayer.email || '',
      phone: cosplayer.phone || '',
      address: cosplayer.address || '',
      city: cosplayer.city || '',
      state: cosplayer.state || '',
      pinCode: cosplayer.pinCode || '',
      cosplayGroupTeamName: cosplayer.collegeName || '', // Cosplay Group/Team Name
      cosplayExperience: cosplayer.message || '', // Cosplay Experience
      status: cosplayer.status || '',
      createdAt: formatDate(cosplayer.createdAt)
    }));

    downloadCSV(csvData, 'cosplayer_registrations', headers);
  };

  const downloadVendorRegistrationsCSV = () => {
    const headers = [
      'registrationId',
      'companyName',
      'contactPerson',
      'contactEmail',
      'contactPhone',
      'address',
      'city',
      'state',
      'pinCode',
      'vendorType', // Extracted from message
      'productsServices', // Extracted from message
      'status',
      'createdAt'
    ];

    const csvData = vendorRegistrations.map((vendor) => {
      // Extract vendor type and products/services from message
      let vendorType = 'Not specified';
      let productsServices = '';
      
      if (vendor.message?.includes('Vendor Type:')) {
        vendorType = vendor.message.includes('Vendor Type: food') ? 'Food' :
                     vendor.message.includes('Vendor Type: beverage') ? 'Beverage' :
                     vendor.message.includes('Vendor Type: both') ? 'Both Food & Beverage' : 'Not specified';
        
        // Extract products/services after vendor type
        const parts = vendor.message.split('\n\n');
        if (parts.length > 1) {
          productsServices = parts[1] || '';
        }
      }

      return {
        registrationId: vendor.registrationId || '',
        companyName: vendor.companyName || '',
        contactPerson: vendor.contactPerson || '',
        contactEmail: vendor.contactEmail || '',
        contactPhone: vendor.contactPhone || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pinCode: vendor.pinCode || '',
        vendorType: vendorType,
        productsServices: productsServices,
        status: vendor.status || '',
        createdAt: formatDate(vendor.createdAt)
      };
    });

    downloadCSV(csvData, 'vendor_registrations', headers);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <span className="w-4 h-4 text-green-600">✓</span>;
      case 'rejected': return <span className="w-4 h-4 text-red-600">✗</span>;
      case 'withdrawn': return <span className="w-4 h-4 text-gray-600">←</span>;
      case 'pending': return <span className="w-4 h-4 text-blue-600">⏱</span>;
      default: return <span className="w-4 h-4 text-blue-600">⏱</span>;
    }
  };

  // Advanced filtering functions for each registration type
  const filterTeamRegistrations = (registrations: TeamRegistration[]) => {
    return registrations.filter(reg => {
      const matchesSearch = searchTerm === '' || 
        reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.captainName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.captainEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGame = teamFilters.game === '' || reg.gameId === teamFilters.game;
      const matchesCollege = teamFilters.college === '' || reg.collegeName === teamFilters.college;
      const matchesStatus = teamFilters.status === 'all' || reg.status === teamFilters.status;
      const matchesDateRange = filterByDateRange(reg.createdAt?.toString() || '', teamFilters.dateRange);
      
      return matchesSearch && matchesGame && matchesCollege && matchesStatus && matchesDateRange;
    });
  };

  const filterMobaOpenRegistrations = (registrations: TeamRegistration[]) => {
    return registrations.filter(reg => {
      const matchesSearch = searchTerm === '' || 
        reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.captainName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.captainEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = teamFilters.status === 'all' || reg.status === teamFilters.status;
      
      return matchesSearch && matchesStatus;
    });
  };

  const filterSponsorRegistrations = (registrations: SponsorRegistration[]) => {
    return registrations.filter(reg => {
      const matchesSearch = searchTerm === '' || 
        reg.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTier = sponsorFilters.tier === '' || reg.sponsorshipTierId === sponsorFilters.tier;
      const matchesStatus = sponsorFilters.status === 'all' || reg.status === sponsorFilters.status;
      const matchesDateRange = filterByDateRange(reg.createdAt?.toString() || '', sponsorFilters.dateRange);
      
      return matchesSearch && matchesTier && matchesStatus && matchesDateRange;
    });
  };

  // Filter for cosplayer registrations
  const filterCosplayerRegistrations = (registrations: any[]) => {
    return registrations.filter(reg => {
      const matchesSearch = searchTerm === '' || 
        reg.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.registrationId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Filter for pure sponsor registrations (exclude vendors and exhibitors)
  const getPureSponsorRegistrations = () => {
    return sponsorRegistrations.filter(reg => {
      // Exclude vendors and exhibitors
      const isVendor = (reg.registrationId && reg.registrationId.startsWith('VEN')) || 
                      (reg.message && reg.message.includes('Vendor Type:'));
      const isExhibitor = reg.registrationId && reg.registrationId.startsWith('EXH');
      
      return !isVendor && !isExhibitor;
    });
  };

  // Clean up sponsor message to remove any vendor/exhibitor content
  const cleanSponsorMessage = (message: string) => {
    if (!message) return message;
    
    // Remove vendor/exhibitor specific content
    let cleanedMessage = message;
    
    // Remove vendor type prefixes
    if (cleanedMessage.includes('Vendor Type:')) {
      const parts = cleanedMessage.split('\n\n');
      if (parts.length > 1) {
        cleanedMessage = parts.slice(1).join('\n\n').trim();
      } else {
        cleanedMessage = '';
      }
    }
    
    // Remove exhibition descriptions
    if (cleanedMessage.includes('Exhibition Description:')) {
      const parts = cleanedMessage.split('\n\n');
      if (parts.length > 1) {
        cleanedMessage = parts.slice(1).join('\n\n').trim();
      } else {
        cleanedMessage = '';
      }
    }
    
    return cleanedMessage || '';
  };

  
  const filterMediaRegistrations = (registrations: MediaPersonRegistration[]) => {
    return registrations.filter(reg => {
      const matchesSearch = searchTerm === '' || 
        reg.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.organization?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = mediaFilters.status === 'all' || reg.status === mediaFilters.status;
      const matchesDateRange = filterByDateRange(reg.createdAt?.toString() || '', mediaFilters.dateRange);
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  };

  // Helper function to filter by date range
  const filterByDateRange = (createdAt: string, dateRange: string) => {
    if (dateRange === 'all') return true;
    
    const createdDate = new Date(createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return createdDate >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return createdDate >= monthAgo;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return createdDate >= quarterAgo;
      default:
        return true;
    }
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600">⟳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-start"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">TXG TechXGames Expo Admin Dashboard</h1>
            <p className="text-gray-600">Manage event registrations and monitor activity</p>
            <p className="text-sm text-purple-600 mt-1">Welcome, {adminUser?.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            className="flex items-center gap-2"
          >
            <span>→</span>
            Logout
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Inter-college</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {teamRegistrations.filter(t => t.registrationType === 'college').length || 0}
                  </p>
                </div>
                <GamingIcon iconId={GamingIcons.USERS} size={32} color="#9333ea" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">MOBA Open</p>
                  <p className="text-3xl font-bold text-green-600">{mobaOpenRegistrations.length || 0}</p>
                </div>
                <GamingIcon iconId={GamingIcons.PARTNERSHIP} size={32} color="#07f85f" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Mini Games</p>
                  <p className="text-3xl font-bold text-pink-600">{miniTournamentRegistrations.length || 0}</p>
                </div>
                <GamingIcon iconId={GamingIcons.EYE} size={32} color="#ec4899" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {teamRegistrations.filter(t => t.status === 'pending').length +
                     sponsorRegistrations.filter(s => s.status === 'pending').length +
                     mediaRegistrations.filter(m => m.status === 'pending').length +
                     miniTournamentRegistrations.filter(m => m.status === 'pending').length}
                  </p>
                </div>
                <GamingIcon iconId={GamingIcons.CLOCK_ICON} size={32} color="#ea580c" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/80 backdrop-blur-sm rounded-lg p-6">
            <TabsList className="flex flex-wrap w-full mb-6 gap-1">
              <TabsTrigger value="overview" className="flex-1 min-w-fit">Overview</TabsTrigger>
              <TabsTrigger value="inter-college" className="flex-1 min-w-fit">Inter College</TabsTrigger>
              <TabsTrigger value="moba-open" className="flex-1 min-w-fit">MOBA 5v5</TabsTrigger>
              <TabsTrigger value="sponsors" className="flex-1 min-w-fit">Sponsors</TabsTrigger>
              <TabsTrigger value="cosplayers" className="flex-1 min-w-fit">Cosplayers</TabsTrigger>
              <TabsTrigger value="vendors" className="flex-1 min-w-fit">Vendors</TabsTrigger>
              <TabsTrigger value="exhibitors" className="flex-1 min-w-fit">Exhibitors</TabsTrigger>
              <TabsTrigger value="media" className="flex-1 min-w-fit">Media</TabsTrigger>
              <TabsTrigger value="mini-tournaments" className="flex-1 min-w-fit">Mini Tournaments</TabsTrigger>
              <TabsTrigger value="manual-entry" className="flex-1 min-w-fit">Manual Entry</TabsTrigger>
              <TabsTrigger value="content" className="flex-1 min-w-fit">Content</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Registration Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Teams Approved</span>
                        <Badge className="bg-green-100 text-green-800">
                          {stats?.approvedTeams || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sponsors Approved</span>
                        <Badge className="bg-green-100 text-green-800">
                          {stats?.approvedSponsors || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Media Approved</span>
                        <Badge className="bg-green-100 text-green-800">
                          {mediaRegistrations.filter(m => m.status === 'approved').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...teamRegistrations.slice(0, 3), ...getPureSponsorRegistrations().slice(0, 2)].map((reg, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            {(reg as any).teamName || (reg as any).companyName || (reg as any).fullName}
                          </span>
                          <Badge className={getStatusColor((reg as any).status)}>
                            {(reg as any).status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Email Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmailTestComponent />
                  </CardContent>
                </Card>
              </div>

              {/* Data Management Section */}
              <div className="mt-8">
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <span className="text-xl">⚠️</span>
                      Data Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-red-700">
                        <strong>Warning:</strong> These actions will permanently mark all test data. This cannot be undone.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          onClick={() => handleBulkDelete('all')} 
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          🗑️ Permanently Delete All Test Data
                        </Button>
                        <div className="text-sm text-gray-600 flex items-center">
                          Total: {teamRegistrations.length + getPureSponsorRegistrations().length + cosplayerRegistrations.length + vendorRegistrations.length + exhibitorRegistrations.length + mediaRegistrations.length} registrations
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Inter College Tab */}
            <TabsContent value="inter-college">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search teams..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={teamFilters.game}
                      onChange={(e) => setTeamFilters(prev => ({ ...prev, game: e.target.value }))}
                    >
                      <option value="">All Games</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={teamFilters.college}
                      onChange={(e) => setTeamFilters(prev => ({ ...prev, college: e.target.value }))}
                    >
                      <option value="">All Colleges</option>
                      {Array.from(new Set(teamRegistrations.map(t => t.collegeName).filter(Boolean))).map(college => (
                        <option key={college} value={college}>{college}</option>
                      ))}
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={teamFilters.status}
                      onChange={(e) => setTeamFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={teamFilters.dateRange}
                      onChange={(e) => setTeamFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadDashboardData} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadTeamRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('teams')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Teams
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterTeamRegistrations(teamRegistrations).map((team) => (
                    <Card key={team.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{team.teamName}</h3>
                            <p className="text-sm text-gray-600">ID: {team.registrationId}</p>
                            <p className="text-sm text-gray-600">Type: {team.registrationType}</p>
                          </div>
                          <Badge className={getStatusColor(team.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(team.status)}
                              {team.status}
                            </span>
                          </Badge>
                        </div>
                        
                        {/* Team Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Team Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Team Name:</span>
                                <span className="font-medium">{team.teamName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Registration Type:</span>
                                <span className="font-medium capitalize">{team.registrationType.replace('_', ' ')}</span>
                              </div>
                              {team.collegeName && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">College Name:</span>
                                  <span className="font-medium">{team.collegeName}</span>
                                </div>
                              )}
                              {team.teamCategory && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Team Category:</span>
                                  <span className="font-medium">{team.teamCategory}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">Game Selected:</span>
                                <span className="font-medium">{team.gameId ? getGameName(team.gameId) : 'Game Not Selected'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Team Members:</span>
                                <span className="font-medium">{team.teamMembers?.length || 0} players</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Substitute:</span>
                                <span className="font-medium">{team.substitute ? 'Yes' : 'No'}</span>
                              </div>
                              {team.additionalMessage && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Additional Message:</span>
                                  <span className="font-medium text-xs max-w-xs truncate">{team.additionalMessage}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Captain Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium">{team.captainName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium text-xs">{team.captainEmail}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium">{team.captainPhone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Address Details */}
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Address</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Address:</span>
                              <span className="font-medium">{team.address || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">City:</span>
                              <span className="font-medium">{team.city || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">State:</span>
                              <span className="font-medium">{team.state || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">PIN Code:</span>
                              <span className="font-medium">{team.pinCode || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Team Members */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Team Members</h4>
                          {team.teamMembers && team.teamMembers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {team.teamMembers.map((member, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-800">Player {index + 1}</div>
                                    <div className="text-gray-600">Name: {member.fullName || 'N/A'}</div>
                                    <div className="text-gray-600">IGN: {member.ign || 'N/A'}</div>
                                    <div className="text-gray-600">Game ID: {member.gameId || 'N/A'}</div>
                                    {/* Student ID for each player */}
                                    {member.studentIdData && (
                                      <div className="mt-2 pt-2 border-t">
                                        <div className="text-xs text-blue-600 mb-1">Student ID</div>
                                        {member.studentIdData?.url && (
                                          <img 
                                            src={member.studentIdData.url} 
                                            alt={`Player ${index + 1} Student ID`}
                                            className="w-24 h-24 object-cover rounded border mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => window.open(member.studentIdData.url, '_blank')}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7 px-2 w-full"
                                          onClick={async () => {
                                            if (member.studentIdData?.url) {
                                              await firebaseStorageService.downloadFile(member.studentIdData.url, `${team.registrationId}_player${index + 1}_student_id`);
                                            } else {
                                              alert('Student ID URL not available');
                                            }
                                          }}
                                        >
                                          <Download className="w-3 h-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No team members registered</p>
                          )}
                        </div>

                        {/* Substitute */}
                        {team.substitute && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Substitute Player</h4>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-sm">
                                <div className="font-medium text-gray-800">Substitute</div>
                                <div className="text-gray-600">Name: {(team.substitute as any)?.fullName || 'N/A'}</div>
                                <div className="text-gray-600">IGN: {team.substitute?.ign || 'N/A'}</div>
                                <div className="text-gray-600">Game ID: {team.substitute?.gameId || 'N/A'}</div>
                                <div className="text-gray-600">Game: {team.substitute?.gameId ? getGameName(team.substitute.gameId) : 'Game Not Selected'}</div>
                                {/* Student ID for substitute */}
                                {(team.substitute as any)?.studentIdData && (
                                  <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs text-blue-600 mb-1">Student ID</div>
                                    {(team.substitute as any)?.studentIdData?.url && (
                                      <img 
                                        src={(team.substitute as any).studentIdData.url} 
                                        alt="Substitute Student ID"
                                        className="w-24 h-24 object-cover rounded border mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open((team.substitute as any).studentIdData.url, '_blank')}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2 w-full"
                                      onClick={async () => {
                                        const url = (team.substitute as any)?.studentIdData?.url;
                                        if (url) {
                                          await firebaseStorageService.downloadFile(url, `${team.registrationId}_substitute_student_id`);
                                        } else {
                                          alert('Student ID URL not available');
                                        }
                                      }}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Registration Info */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(team.createdAt)}</span>
                            <span>Terms Accepted: {team.termsAccepted ? '✅ Yes' : '❌ No'}</span>
                            {(team.registrationType === 'college' || team.registrationType === 'open_category') && (
                              <span>Institution Declaration: {team.institutionDeclaration ? '✅ Yes' : '❌ No'}</span>
                            )}
                            {(team.registrationType === 'college' || team.registrationType === 'open_category') && (
                              <span>Livestream Consent: {team.livestreamConsent ? '✅ Yes' : '❌ No'}</span>
                            )}
                          </div>
                        </div>

                        {/* Status Management */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2 flex-wrap">
                            {team.status !== 'approved' && team.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  console.log('Full team object:', team);
                                  console.log('Team ID being used:', team.id);
                                  console.log('Team Registration ID:', team.registrationId);
                                  console.log('All team properties:', Object.keys(team));
                                  handleStatusUpdate(team.id, 'inter-college', 'approved');
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {team.status !== 'rejected' && team.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(team.id, 'inter-college', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {team.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(team.id, 'inter-college', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {team.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(team.id, 'inter-college', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* MOBA 5v5 Open Tournament Tab */}
            <TabsContent value="moba-open">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search MOBA teams..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={teamFilters.status}
                      onChange={(e) => setTeamFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadDashboardData} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadTeamRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterMobaOpenRegistrations(mobaOpenRegistrations).map((team) => (
                    <Card key={team.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{team.teamName}</h3>
                            <p className="text-sm text-gray-600">ID: {team.registrationId}</p>
                            <p className="text-sm text-gray-600">Organization: {team.collegeName}</p>
                          </div>
                          <Badge 
                            className={`${
                              team.status === 'approved' ? 'bg-green-100 text-green-800' :
                              team.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {team.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Captain</p>
                            <p className="text-sm">{team.captainName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Contact</p>
                            <p className="text-sm">{team.captainEmail}</p>
                            <p className="text-sm">{team.captainPhone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Game</p>
                            <p className="text-sm">{getGameName(team.gameId)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Registered</p>
                            <p className="text-sm">{formatDate(team.createdAt)}</p>
                          </div>
                        </div>

                        {/* Team Members */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Team Members</h4>
                          {team.teamMembers && team.teamMembers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {team.teamMembers.map((member, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-800">Player {index + 1}</div>
                                    <div className="text-gray-600">Name: {member.fullName || 'N/A'}</div>
                                    <div className="text-gray-600">IGN: {member.ign || 'N/A'}</div>
                                    <div className="text-gray-600">Game ID: {member.gameId || 'N/A'}</div>
                                    {/* Aadhaar for each player */}
                                    {(member as any).aadhaarData && (
                                      <div className="mt-2 pt-2 border-t">
                                        <div className="text-xs text-blue-600 mb-1">Aadhaar</div>
                                        {(member as any).aadhaarData?.url && (
                                          <img 
                                            src={(member as any).aadhaarData.url} 
                                            alt={`Player ${index + 1} Aadhaar`}
                                            className="w-24 h-24 object-cover rounded border mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => window.open((member as any).aadhaarData.url, '_blank')}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-7 px-2 w-full"
                                          onClick={async () => {
                                            const url = (member as any).aadhaarData?.url;
                                            if (url) {
                                              await firebaseStorageService.downloadFile(url, `${team.registrationId}_player${index + 1}_aadhaar`);
                                            } else {
                                              alert('Aadhaar URL not available');
                                            }
                                          }}
                                        >
                                          <Download className="w-3 h-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No team members registered</p>
                          )}
                        </div>

                        {/* Substitute */}
                        {team.substitute && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Substitute Player</h4>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-sm">
                                <div className="font-medium text-gray-800">Substitute</div>
                                <div className="text-gray-600">Name: {(team.substitute as any)?.fullName || 'N/A'}</div>
                                <div className="text-gray-600">IGN: {team.substitute?.ign || 'N/A'}</div>
                                <div className="text-gray-600">Game ID: {team.substitute?.gameId || 'N/A'}</div>
                                <div className="text-gray-600">Game: {team.substitute?.gameId ? getGameName(team.substitute.gameId) : 'Game Not Selected'}</div>
                                {/* Aadhaar for substitute */}
                                {(team.substitute as any)?.aadhaarData && (
                                  <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs text-blue-600 mb-1">Aadhaar</div>
                                    {(team.substitute as any)?.aadhaarData?.url && (
                                      <img 
                                        src={(team.substitute as any).aadhaarData.url} 
                                        alt="Substitute Aadhaar"
                                        className="w-24 h-24 object-cover rounded border mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open((team.substitute as any).aadhaarData.url, '_blank')}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2 w-full"
                                      onClick={async () => {
                                        const url = (team.substitute as any)?.aadhaarData?.url;
                                        if (url) {
                                          await firebaseStorageService.downloadFile(url, `${team.registrationId}_substitute_aadhaar`);
                                        } else {
                                          alert('Aadhaar URL not available');
                                        }
                                      }}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Registration Info */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(team.createdAt)}</span>
                            <span>Terms Accepted: {team.termsAccepted ? '✅ Yes' : '❌ No'}</span>
                            <span>Institution Declaration: {team.institutionDeclaration ? '✅ Yes' : '❌ No'}</span>
                            <span>Livestream Consent: {team.livestreamConsent ? '✅ Yes' : '❌ No'}</span>
                          </div>
                        </div>

                        {/* Status Management */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(team.id, 'moba-open', 'approved')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={team.status === 'approved'}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(team.id, 'moba-open', 'rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={team.status === 'rejected'}
                            >
                              Reject
                            </Button>
                            {team.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(team.id, 'moba-open', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {team.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(team.id, 'moba-open', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                                disabled={team.status === 'withdrawn'}
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Sponsors Tab */}
            <TabsContent value="sponsors">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search sponsors..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.tier}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, tier: e.target.value }))}
                    >
                      <option value="">All Tiers</option>
                      {sponsorshipTiers.map(tier => (
                        <option key={tier.id} value={tier.id}>{tier.name}</option>
                      ))}
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.status}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.dateRange}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadDashboardData} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadSponsorRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('sponsors')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Sponsors
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterSponsorRegistrations(getPureSponsorRegistrations()).map((sponsor) => (
                    <Card key={sponsor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{sponsor.companyName}</h3>
                            <p className="text-sm text-gray-600">ID: {sponsor.registrationId}</p>
                            <p className="text-sm text-gray-600">Sponsorship Tier: {sponsor.sponsorshipTierId}</p>
                          </div>
                          <Badge className={getStatusColor(sponsor.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(sponsor.status)}
                              {sponsor.status}
                            </span>
                          </Badge>
                        </div>
                        
                        {/* Sponsor Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Company Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Company Name:</span>
                                <span className="font-medium">{sponsor.companyName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sponsorship Tier:</span>
                                <span className="font-medium">{getSponsorshipTierName(sponsor.sponsorshipTierId || '')}</span>
                              </div>
                              {sponsor.message && cleanSponsorMessage(sponsor.message) && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Message:</span>
                                  <span className="font-medium text-xs max-w-xs">{cleanSponsorMessage(sponsor.message)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Contact Person</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium">{sponsor.contactPerson}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium text-xs">{sponsor.contactEmail}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium">{sponsor.contactPhone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Address Details */}
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Address</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Address:</span>
                              <span className="font-medium">{sponsor.address || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">City:</span>
                              <span className="font-medium">{sponsor.city || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">State:</span>
                              <span className="font-medium">{sponsor.state || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">PIN Code:</span>
                              <span className="font-medium">{sponsor.pinCode || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Registration Info */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(sponsor.createdAt)}</span>
                            <span>Last Updated: {formatDate(sponsor.updatedAt)}</span>
                          </div>
                        </div>

                        {/* Status Management */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            {sponsor.status !== 'approved' && sponsor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(sponsor.id, 'sponsor', 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {sponsor.status !== 'rejected' && sponsor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(sponsor.id, 'sponsor', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {sponsor.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(sponsor.id, 'sponsor', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {sponsor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(sponsor.id, 'sponsor', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search media..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadDashboardData} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadMediaRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('media')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Media
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterMediaRegistrations(mediaRegistrations).map((media) => (
                    <Card key={media.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{media.fullName}</h3>
                            <p className="text-sm text-gray-600">ID: {media.registrationId}</p>
                            <p className="text-sm text-gray-600">Media Person Registration</p>
                          </div>
                          <Badge className={getStatusColor(media.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(media.status)}
                              {media.status}
                            </span>
                          </Badge>
                        </div>
                        
                        {/* Media Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Personal Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Full Name:</span>
                                <span className="font-medium">{media.fullName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium text-xs">{media.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium">{media.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 border-b pb-2">Professional Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Organization:</span>
                                <span className="font-medium">{media.organization || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Role:</span>
                                <span className="font-medium">{media.role || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className="font-medium capitalize">{media.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Address Details */}
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-gray-800 border-b pb-2">Address</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Address:</span>
                              <span className="font-medium">{media.address || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">City:</span>
                              <span className="font-medium">{media.city || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">State:</span>
                              <span className="font-medium">{media.state || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">PIN Code:</span>
                              <span className="font-medium">{media.pinCode || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Registration Info */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(media.createdAt)}</span>
                            <span>Last Updated: {formatDate(media.updatedAt)}</span>
                          </div>
                        </div>

                        {/* Status Management */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            {media.status !== 'approved' && media.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(media.id, 'media', 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {media.status !== 'rejected' && media.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(media.id, 'media', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {media.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(media.id, 'media', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {media.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(media.id, 'media', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Manual Data Entry Tab */}
            <TabsContent value="manual-entry">
              <ManualDataEntry />
            </TabsContent>

            {/* Cosplayers Tab */}
            <TabsContent value="cosplayers">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Cosplayer Registrations</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => loadDashboardData()} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadCosplayerRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('cosplayers')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Cosplayers
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search cosplayers..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.status}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.dateRange}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterCosplayerRegistrations(cosplayerRegistrations).map((cosplayer) => (
                    <Card key={cosplayer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{cosplayer.fullName}</h3>
                            <p className="text-sm text-gray-600">ID: {cosplayer.registrationId}</p>
                          </div>
                          <Badge className={getStatusColor(cosplayer.status)}>
                            {getStatusIcon(cosplayer.status)} {cosplayer.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{cosplayer.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{cosplayer.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Address:</span>
                            <span className="font-medium text-xs max-w-xs truncate">
                              {cosplayer.address && cosplayer.city && cosplayer.state 
                                ? `${cosplayer.address}, ${cosplayer.city}, ${cosplayer.state}`
                                : cosplayer.address || 'N/A'
                              }
                            </span>
                          </div>
                          {cosplayer.collegeName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cosplay Group/Team:</span>
                              <span className="font-medium">{cosplayer.collegeName}</span>
                            </div>
                          )}
                          {cosplayer.message && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cosplay Experience:</span>
                              <span className="font-medium text-xs max-w-xs truncate" title={cosplayer.message}>
                                {cosplayer.message}
                              </span>
                            </div> 
                          )}
                          {!cosplayer.collegeName && !cosplayer.message && (
                            <div className="text-xs text-orange-600 italic">
                              Cosplay-specific details not available (may be from older registration)
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(cosplayer.createdAt)}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            {cosplayer.status !== 'approved' && cosplayer.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(cosplayer.id, 'cosplayer', 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {cosplayer.status !== 'rejected' && cosplayer.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(cosplayer.id, 'cosplayer', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {cosplayer.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(cosplayer.id, 'cosplayer', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {cosplayer.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(cosplayer.id, 'cosplayer', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Vendors Tab */}
            <TabsContent value="vendors">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Vendor Registrations</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => loadDashboardData()} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={downloadVendorRegistrationsCSV} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('vendors')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Vendors
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search vendors..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.tier}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, tier: e.target.value }))}
                    >
                      <option value="">All Types</option>
                      <option value="food">Food Vendor</option>
                      <option value="beverage">Beverage Vendor</option>
                      <option value="both">Food & Beverage</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.status}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.dateRange}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterSponsorRegistrations(vendorRegistrations).map((vendor) => (
                    <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{vendor.companyName}</h3>
                            <p className="text-sm text-gray-600">ID: {vendor.registrationId}</p>
                          </div>
                          <Badge className={getStatusColor(vendor.status)}>
                            {getStatusIcon(vendor.status)} {vendor.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contact Person:</span>
                            <span className="font-medium">{vendor.contactPerson}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium text-xs">{vendor.contactEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{vendor.contactPhone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vendor Type:</span>
                            <span className="font-medium">
                              {vendor.message?.includes('Vendor Type: food') ? 'Food' :
                               vendor.message?.includes('Vendor Type: beverage') ? 'Beverage' :
                               vendor.message?.includes('Vendor Type: both') ? 'Both Food & Beverage' : 'Not specified'}
                            </span>
                          </div>
                          {vendor.message && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Products/Services:</span>
                              <span className="font-medium text-xs max-w-xs truncate" title={vendor.message.split('\n\n')[1]}>
                                {vendor.message.split('\n\n')[1] || 'Not specified'}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Business Address:</span>
                            <span className="font-medium text-xs max-w-xs truncate">
                              {vendor.address && vendor.city && vendor.state 
                                ? `${vendor.address}, ${vendor.city}, ${vendor.state} - ${vendor.pinCode || 'N/A'}`
                                : vendor.address || 'Not specified'
                              }
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(vendor.createdAt)}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            {vendor.status !== 'approved' && vendor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(vendor.id, 'vendor', 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {vendor.status !== 'rejected' && vendor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(vendor.id, 'vendor', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {vendor.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(vendor.id, 'vendor', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {vendor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(vendor.id, 'vendor', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Exhibitors Tab */}
            <TabsContent value="exhibitors">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Exhibitor Registrations</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => loadDashboardData()} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button 
                      onClick={() => handleBulkDelete('exhibitors')} 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Permanently Delete All Exhibitors
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search exhibitors..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.tier}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, tier: e.target.value }))}
                    >
                      <option value="">All Types</option>
                      <option value="technology">Technology</option>
                      <option value="education">Education</option>
                      <option value="gaming">Gaming</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.status}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={sponsorFilters.dateRange}
                      onChange={(e) => setSponsorFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filterSponsorRegistrations(exhibitorRegistrations).map((exhibitor) => (
                    <Card key={exhibitor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{exhibitor.companyName}</h3>
                            <p className="text-sm text-gray-600">ID: {exhibitor.registrationId}</p>
                          </div>
                          <Badge className={getStatusColor(exhibitor.status)}>
                            {getStatusIcon(exhibitor.status)} {exhibitor.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contact Person:</span>
                            <span className="font-medium">{exhibitor.contactPerson}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium text-xs">{exhibitor.contactEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{exhibitor.contactPhone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Exhibition Description:</span>
                            <span className="font-medium text-xs max-w-xs truncate" title={exhibitor.message?.includes('Exhibition Description:') ? exhibitor.message.split('Exhibition Description:')[1]?.split('\n\n')[0]?.trim() : 'Not specified'}>
                              {exhibitor.message?.includes('Exhibition Description:') ? exhibitor.message.split('Exhibition Description:')[1]?.split('\n\n')[0]?.trim() : 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Booth/Space Requirements:</span>
                            <span className="font-medium text-xs max-w-xs truncate" title={exhibitor.message?.includes('Booth/Space Requirements:') ? exhibitor.message.split('Booth/Space Requirements:')[1]?.trim() : 'Not specified'}>
                              {exhibitor.message?.includes('Booth/Space Requirements:') ? exhibitor.message.split('Booth/Space Requirements:')[1]?.trim() : 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Organization Address:</span>
                            <span className="font-medium text-xs max-w-xs truncate">
                              {exhibitor.address && exhibitor.city && exhibitor.state 
                                ? `${exhibitor.address}, ${exhibitor.city}, ${exhibitor.state} - ${exhibitor.pinCode || 'N/A'}`
                                : exhibitor.address || 'Not specified'
                              }
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Registered: {formatDate(exhibitor.createdAt)}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            {exhibitor.status !== 'approved' && exhibitor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(exhibitor.id, 'exhibitor', 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            {exhibitor.status !== 'rejected' && exhibitor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(exhibitor.id, 'exhibitor', 'rejected')}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            )}
                            {exhibitor.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(exhibitor.id, 'exhibitor', 'pending')}
                              >
                                Reset to Pending
                              </Button>
                            )}
                            {exhibitor.status !== 'withdrawn' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(exhibitor.id, 'exhibitor', 'withdrawn')}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Mini Tournaments Tab */}
            <TabsContent value="mini-tournaments">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Mini Tournament Registrations</h2>
                  <div className="flex gap-4">
                    <Badge className="bg-blue-100 text-blue-800">
                      Total: {miniTournamentRegistrations.length}
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Pending: {miniTournamentRegistrations.filter(r => r.status === 'pending').length}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      Approved: {miniTournamentRegistrations.filter(r => r.status === 'approved').length}
                    </Badge>
                  </div>
                </div>

                {/* Mini Games Tabs */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Filter by Game:</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedMiniGame === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMiniGame('all')}
                      className={selectedMiniGame === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      All Games ({miniTournamentRegistrations.length})
                    </Button>
                    {miniTournamentGames.map(game => {
                      const count = miniTournamentRegistrations.filter(r => getMiniTournamentGame(r) === game).length;
                      return (
                        <Button
                          key={game}
                          variant={selectedMiniGame === game ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedMiniGame(game)}
                          className={selectedMiniGame === game ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          {game} ({count})
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Filtered Registrations */}
                {(() => {
                  const filteredRegistrations = selectedMiniGame === 'all'
                    ? miniTournamentRegistrations
                    : miniTournamentRegistrations.filter(r => getMiniTournamentGame(r) === selectedMiniGame);

                  if (filteredRegistrations.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>No registrations found for {selectedMiniGame === 'all' ? 'any game' : selectedMiniGame}.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRegistrations.map((registration, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GamingIcon iconId={GamingIcons.GAMEPAD} size={20} color="#ff6b6b" />
                            <span className="text-lg font-semibold">{registration.fullName}</span>
                          </div>
                          <Badge 
                            className={`${
                              registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                              registration.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {registration.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Registration ID:</span>
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{registration.registrationId}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Game:</span>
                            <span className="text-sm font-semibold">
                              {registration.message && registration.message.includes('Game:') 
                                ? registration.message.split('Game:')[1]?.split('\n')[0]?.trim() 
                                : 'Unknown'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Nickname:</span>
                            <span className="text-sm font-semibold">{registration.collegeName || 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">WhatsApp:</span>
                            <span className="text-sm">{registration.phone}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Phone:</span>
                            <span className="text-sm">{registration.message && registration.message.includes('Phone Call:') 
                              ? registration.message.split('Phone Call:')[1]?.split('\n')[0]?.trim() 
                              : 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Age:</span>
                            <span className="text-sm">{registration.message && registration.message.includes('Age:') 
                              ? registration.message.split('Age:')[1]?.split('\n')[0]?.trim() 
                              : 'N/A'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Gender:</span>
                            <span className="text-sm">{registration.message && registration.message.includes('Gender:') 
                              ? registration.message.split('Gender:')[1]?.split('\n')[0]?.trim() 
                              : 'N/A'}</span>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-600">Passport Photo:</span>
                            <div className="text-sm font-medium">
                              <PassportPhotoDisplay registrationId={registration.registrationId} />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Email:</span>
                            <span className="text-sm">{registration.email}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Registered:</span>
                            <span className="text-sm">{formatDate(registration.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(registration.id, 'mini-tournament', 'approved')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={registration.status === 'approved'}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(registration.id, 'mini-tournament', 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={registration.status === 'rejected'}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(registration.id, 'mini-tournament', 'withdrawn')}
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                            disabled={registration.status === 'withdrawn'}
                          >
                            Withdraw
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

          {/* Content Management Tab */}
            <TabsContent value="content">
              <ContentManagement />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
